import { Context, h, Schema  } from 'koishi'
import 'koishi-plugin-puppeteer'
import * as fs from 'fs/promises'
import path from 'path'
import { log } from 'console'
export const name = 'mhgu-helper'

export const inject =['puppeteer'] 

export interface Config {}

export const Config: Schema<Config> = Schema.object({})

export function apply(ctx: Context) {
  ctx.command('monster <name>', 'mhgu')
  .action((_,name) => getMonsterInfo(ctx,name))
  .example('monster 阁螳螂 查询怪物:阁螳螂 信息')

}


async function getMonsterInfo(ctx: Context,name: string) {
  try {
    const htmlPath = path.join(__dirname,'../public/monster_info/'+name+'.html')
    let monsterHtml = await fs.readFile(htmlPath, 'utf-8');
    const page = await ctx.puppeteer.page();
    await page.setContent(monsterHtml, { waitUntil: "networkidle2" });
    const leaderboardElement = await page.$("body");
    log(leaderboardElement)
    if (!leaderboardElement) {
      return '没有找到相关的怪物信息'
    }
    const boundingBox = await leaderboardElement.boundingBox();
    await page.setViewport({
      width: Math.ceil(boundingBox.width),
      height: Math.ceil(boundingBox.height)
    });
    const imgBuf = await leaderboardElement.screenshot({ captureBeyondViewport: false });
    await page.close();
    return h.image(imgBuf, "image/png")
  } catch (err) {
    ctx.logger.error(err);
  }
}