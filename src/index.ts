import { Context, h, Schema, Session } from "koishi";
import "koishi-plugin-puppeteer";
import * as fs from "fs/promises";
import path from "path";
import { log } from "console";
export const name = "mhgu-helper";

export const inject = ["puppeteer"];

export interface Config {}

export const Config: Schema<Config> = Schema.object({});

export function apply(ctx: Context) {
  ctx
    .command("monster <name>", "mhgu")
    .action(({ session }, name) => getMonsterInfo(session, ctx, name))
    .example("monster 阁螳螂 查询怪物:阁螳螂 信息");
}

async function getMonsterInfo(session: Session, ctx: Context, name: string) {
  try {
    const pluginPath = path.join(__dirname, "../public/monster_info/");

    let monsterNameArray = await monsterNameFuzzySearch(name, pluginPath);
    if (monsterNameArray.length === 0) {
      return "未找到相关怪物信息";
    }
    let htmlPath = "";
    try {
      await fs.access(pluginPath + name + ".html");
      ctx.logger.info("精确匹配到" + name);
      htmlPath = pluginPath + name + ".html";
      monsterNameArray = [];
    } catch (noFile) {
      htmlPath = pluginPath + monsterNameArray[0] + ".html";
      ctx.logger.info("模糊匹配到" + monsterNameArray[0]);
    }
    let monsterHtml = await fs.readFile(htmlPath, "utf-8");
    const page = await ctx.puppeteer.page();
    await page.setContent(monsterHtml, { waitUntil: "networkidle2" });
    const leaderboardElement = await page.$("body");

    const boundingBox = await leaderboardElement.boundingBox();
    await page.setViewport({
      width: Math.ceil(boundingBox.width),
      height: Math.ceil(boundingBox.height),
    });
    const imgBuf = await leaderboardElement.screenshot({
      captureBeyondViewport: false,
    });
    await page.close();

    await session.send(h.image(imgBuf, "image/png"));
    if (monsterNameArray.length > 1) {
      let sendArray = [];
      for (let i = 1; i < monsterNameArray.length; i++) {
        sendArray.push(monsterNameArray[i]);
      }
      session.send("其他相关怪物:" + sendArray);
    }
    return;
  } catch (err) {
    ctx.logger.error(err);
  }
}

async function monsterNameFuzzySearch(query: string, pluginPath: string) {
  const monsterIndexJsonFile = await fs.readFile(
    pluginPath + "monster_index.json",
    "utf-8"
  );
  const monsterIndexArray = JSON.parse(monsterIndexJsonFile);
  const queryRegex = new RegExp(query.split("").join(".*"), "i");
  return monsterIndexArray.filter((item: string) => queryRegex.test(item));
}
