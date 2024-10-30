import { Context, h, Schema, Session } from "koishi";
import "koishi-plugin-puppeteer";
import * as fs from "fs/promises";
import { Database } from "sqlite3";
import path from "path";

export const name = "mhgu-helper";

export const inject = ["puppeteer"];

export interface Config {}

export const Config: Schema<Config> = Schema.object({});

export function apply(ctx: Context) {
  ctx
    .command("monster <name>", "查mhgu怪物信息")
    .alias("怪物")
    .action(({ session }, name) => getMonsterInfo(session, ctx, name))
    .example("monster 阁螳螂 查询怪物:阁螳螂 信息");
  ctx
    .command("equip <name>", "查mhgu装备信息")
    .alias("装备")
    .action(({ session }, name) => getEquipInfo(session, ctx, name))
    .example("equip 橡子铠甲 查询装备:橡子铠甲 信息");

  ctx.command("skill <name>", "查mhgu技能信息(未实现)");
  // .action(({ session }, name) => getSkillInfo(session, ctx, name))
  // .example("skill 炮术 查询技能:炮术 信息");
}

async function getMonsterInfo(session: Session, ctx: Context, name: string) {
  try {
    const infoPath = path.join(__dirname, "../public/monster_info/");

    let monsterNameArray = await fuzzySearch(name, "monster");
    if (monsterNameArray.length === 0) {
      return "未找到相关怪物信息";
    }
    let htmlPath = "";
    try {
      await fs.access(infoPath + name + ".html");
      ctx.logger.info("精确匹配到" + name);
      htmlPath = infoPath + name + ".html";
      monsterNameArray = [];
    } catch (noFile) {
      htmlPath = infoPath + monsterNameArray[0] + ".html";
      ctx.logger.info("模糊匹配到" + monsterNameArray[0]);
    }
    const imgBuf = await shotImg(htmlPath, ctx);

    await session.send(h.image(imgBuf, "image/png"));
    if (monsterNameArray.length > 1) {
      let sendArray = [];
      let length = -1;
      let toLong = false;
      if (monsterNameArray.length <= 5) {
        length = monsterNameArray.length;
      } else {
        length = 5;
        toLong = true;
      }

      for (let i = 1; i < length; i++) {
        sendArray.push(monsterNameArray[i]);
      }

      if (toLong) {
        session.send(
          "其他相关怪物:" +
            sendArray +
            "...等" +
            (monsterNameArray.length - length) +
            "个怪物"
        );
      } else {
        session.send("其他相关怪物:" + sendArray);
      }
    }
    return;
  } catch (err) {
    ctx.logger.error(err);
  }
}

// async function monsterNameFuzzySearch(query: string) {
//   const monsterIndexJsonFile = await fs.readFile(__dirname + "", "utf-8");
//   const monsterIndexArray = JSON.parse(monsterIndexJsonFile);
//   const queryRegex = new RegExp(query.split("").join(".*"), "i");
//   return monsterIndexArray.filter((item: string) => queryRegex.test(item));
// }

async function getEquipInfo(session: Session, ctx: Context, name: string) {
  try {
    const infoPath = path.join(__dirname, "../public/equip_info/");

    let equipNameArray = await fuzzySearch(name, "equip");
    if (equipNameArray.length === 0) {
      return "未找到相关装备信息";
    }
    let htmlPath = "";
    try {
      await fs.access(infoPath + name + ".html");
      ctx.logger.info("精确匹配到" + name);
      htmlPath = infoPath + name + ".html";
      equipNameArray = [];
    } catch (noFile) {
      htmlPath = infoPath + equipNameArray[0] + ".html";
      ctx.logger.info("模糊匹配到" + equipNameArray[0]);
    }
    const imgBuf = await shotImg(htmlPath, ctx);

    await session.send(h.image(imgBuf, "image/png"));
    if (equipNameArray.length > 1) {
      let sendArray = [];
      let length = -1;
      let toLong = false;
      if (equipNameArray.length <= 5) {
        length = equipNameArray.length;
      } else {
        length = 5;
        toLong = true;
      }

      for (let i = 1; i < length; i++) {
        sendArray.push(equipNameArray[i]);
      }

      if (toLong) {
        session.send(
          "其他相关装备:" +
            sendArray +
            "...等" +
            (equipNameArray.length - length) +
            "套装备"
        );
      } else {
        session.send("其他相关装备:" + sendArray);
      }
    }
    return;
  } catch (err) {
    ctx.logger.error(err);
  }
}

async function getSkillInfo(session: Session, ctx: Context, name: string) {}

async function shotImg(htmlPath, ctx: Context) {
  let htmlInfo = await fs.readFile(htmlPath, "utf-8");

  const page = await ctx.puppeteer.page();
  await page.setContent(htmlInfo, { waitUntil: "networkidle2" });
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
  return imgBuf;
}

async function fuzzySearch(query: string, type: string) {
  let jsonPath = "";
  if (type === "monster") {
    jsonPath = path.join(
      __dirname,
      "../public/monster_info/monster_index.json"
    );
  } else if (type === "equip") {
    jsonPath = path.join(__dirname, "../public/equip_info/equip_index.json");
  }

  const indexJsonFile = await fs.readFile(jsonPath, "utf-8");
  const indexArray = JSON.parse(indexJsonFile);
  const queryRegex = new RegExp(query.split("").join(".*"), "i");
  return indexArray.filter((item: string) => queryRegex.test(item));
}
