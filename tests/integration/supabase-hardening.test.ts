import assert from "node:assert/strict";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";

const url = process.env.TEST_SUPABASE_URL;
const publishableKey = process.env.TEST_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const configured = Boolean(url && publishableKey && serviceRoleKey);
const integrationTest = configured ? test : test.skip;

function adminClient() {
  return createClient(url!, serviceRoleKey!, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

integrationTest("one student can keep at most one group membership", async () => {
  const admin = adminClient();
  const suffix = crypto.randomUUID();
  const email = `habitat-group-${suffix}@example.com`;
  const password = `Habitat!${suffix}`;
  let userId: string | undefined;
  const groupIds: string[] = [];

  try {
    const { data: created, error: userError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: "TDD Group Student" }
    });
    assert.ifError(userError);
    assert.ok(created.user);
    userId = created.user.id;

    for (const name of [`TDD A ${suffix}`, `TDD B ${suffix}`]) {
      const { data, error } = await admin.from("groups").insert({ name }).select("id").single();
      assert.ifError(error);
      assert.ok(data);
      groupIds.push(data.id);
    }

    const { error: firstError } = await admin
      .from("group_members")
      .upsert({ profile_id: userId, group_id: groupIds[0] }, { onConflict: "profile_id" });
    assert.ifError(firstError);

    const { error: secondError } = await admin
      .from("group_members")
      .upsert({ profile_id: userId, group_id: groupIds[1] }, { onConflict: "profile_id" });
    assert.ifError(secondError);

    const { data: memberships, error: membershipError } = await admin
      .from("group_members")
      .select("profile_id,group_id")
      .eq("profile_id", userId);
    assert.ifError(membershipError);
    assert.ok(memberships);
    assert.equal(memberships.length, 1);
    assert.equal(memberships[0].group_id, groupIds[1]);
  } finally {
    if (userId) await admin.auth.admin.deleteUser(userId);
    if (groupIds.length > 0) await admin.from("groups").delete().in("id", groupIds);
  }
});

integrationTest("RLS exposes global and matching-group classes only", async () => {
  const admin = adminClient();
  const suffix = crypto.randomUUID();
  const password = `Habitat!${suffix}`;
  const emails = [
    `habitat-rls-a-${suffix}@example.com`,
    `habitat-rls-b-${suffix}@example.com`
  ];
  const userIds: string[] = [];
  const groupIds: string[] = [];
  const classIds: string[] = [];

  try {
    for (const [index, email] of emails.entries()) {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: `TDD RLS Student ${index + 1}` }
      });
      assert.ifError(error);
      assert.ok(data.user);
      userIds.push(data.user.id);
    }

    for (const name of [`TDD RLS A ${suffix}`, `TDD RLS B ${suffix}`]) {
      const { data, error } = await admin.from("groups").insert({ name }).select("id").single();
      assert.ifError(error);
      assert.ok(data);
      groupIds.push(data.id);
    }

    const { error: membershipError } = await admin.from("group_members").insert([
      { profile_id: userIds[0], group_id: groupIds[0] },
      { profile_id: userIds[1], group_id: groupIds[1] }
    ]);
    assert.ifError(membershipError);

    const classes = [
      {
        title: `TDD Global ${suffix}`,
        description: "",
        category: "Fuerza",
        level: "Todos",
        video_provider: "cloudinary",
        video_ref: `habitat/classes/global-${suffix}`,
        published: true
      },
      {
        title: `TDD Restricted ${suffix}`,
        description: "",
        category: "Fuerza",
        level: "Todos",
        video_provider: "cloudinary",
        video_ref: `habitat/classes/restricted-${suffix}`,
        published: true
      },
      {
        title: `TDD Draft ${suffix}`,
        description: "",
        category: "Fuerza",
        level: "Todos",
        video_provider: "cloudinary",
        video_ref: `habitat/classes/draft-${suffix}`,
        published: false
      }
    ];

    const { data: createdClasses, error: classError } = await admin
      .from("classes")
      .insert(classes)
      .select("id,title");
    assert.ifError(classError);
    assert.ok(createdClasses);
    assert.equal(createdClasses.length, 3);
    classIds.push(...createdClasses.map((item) => item.id));

    const restricted = createdClasses.find((item) => item.title.startsWith("TDD Restricted"));
    assert.ok(restricted);
    const { error: classGroupError } = await admin
      .from("class_groups")
      .insert({ class_id: restricted.id, group_id: groupIds[0] });
    assert.ifError(classGroupError);

    const visibleTitles: string[][] = [];
    for (const email of emails) {
      const student = createClient(url!, publishableKey!, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
      const { error: signInError } = await student.auth.signInWithPassword({ email, password });
      assert.ifError(signInError);
      const { data, error } = await student
        .from("classes")
        .select("title")
        .like("title", `TDD %${suffix}`);
      assert.ifError(error);
      assert.ok(data);
      visibleTitles.push(data.map((item) => item.title));
    }

    assert.ok(visibleTitles[0].some((title) => title.startsWith("TDD Global")));
    assert.ok(visibleTitles[0].some((title) => title.startsWith("TDD Restricted")));
    assert.ok(!visibleTitles[0].some((title) => title.startsWith("TDD Draft")));

    assert.ok(visibleTitles[1].some((title) => title.startsWith("TDD Global")));
    assert.ok(!visibleTitles[1].some((title) => title.startsWith("TDD Restricted")));
    assert.ok(!visibleTitles[1].some((title) => title.startsWith("TDD Draft")));
  } finally {
    if (classIds.length > 0) await admin.from("classes").delete().in("id", classIds);
    if (userIds.length > 0) {
      for (const userId of userIds) await admin.auth.admin.deleteUser(userId);
    }
    if (groupIds.length > 0) await admin.from("groups").delete().in("id", groupIds);
  }
});
