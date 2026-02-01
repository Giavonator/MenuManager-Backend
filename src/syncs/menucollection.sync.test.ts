import { assert, assertEquals } from "jsr:@std/assert";
import * as concepts from "@test-concepts";
import syncs from "@syncs";
import { ID } from "@utils/types.ts";

const { Engine, Requesting, MenuCollection, client } = concepts;

let syncsRegistered = false;
if (!syncsRegistered) {
  Engine.register(syncs);
  syncsRegistered = true;
}

Deno.test("MenuCollection updateMenu sync supports partial updates", async (t) => {
  const actingUser = "user-1" as ID;
  const originalDate = new Date(Date.UTC(2030, 0, 10));
  const updatedDate = new Date(Date.UTC(2030, 0, 11));

  let menuId: ID;

  await t.step("1. Create a menu", async () => {
    const createMenu = await MenuCollection.createMenu({
      name: "Original Menu",
      date: originalDate,
      actingUser,
    });
    menuId = (createMenu as { menu: ID }).menu;
    assert(menuId);
  });

  await t.step("2. Update date only via Requesting", async () => {
    const { request } = await Requesting.request({
      path: "/MenuCollection/updateMenu",
      menu: menuId,
      date: updatedDate,
      session: actingUser,
    });

    const [{ response }] = await Requesting._awaitResponse({ request });
    assertEquals(response, { success: true });

    const menuDetails = await MenuCollection._getMenuDetails({ menu: menuId });
    assertEquals(
      (menuDetails as { date: Date }[])[0].date.toISOString(),
      updatedDate.toISOString(),
    );
  });

  await t.step("3. Update name only via Requesting", async () => {
    const { request } = await Requesting.request({
      path: "/MenuCollection/updateMenu",
      menu: menuId,
      name: "Renamed Menu",
      session: actingUser,
    });

    const [{ response }] = await Requesting._awaitResponse({ request });
    assertEquals(response, { success: true });

    const menuDetails = await MenuCollection._getMenuDetails({ menu: menuId });
    assertEquals((menuDetails as { name: string }[])[0].name, "Renamed Menu");
  });

  await t.step("4. Reject update with no fields", async () => {
    const { request } = await Requesting.request({
      path: "/MenuCollection/updateMenu",
      menu: menuId,
      session: actingUser,
    });

    const [{ response }] = await Requesting._awaitResponse({ request });
    const error = (response as { error?: string }).error;
    assertEquals(
      error,
      "No valid fields provided for menu update (name or date).",
    );
  });

  await client.close();
});

