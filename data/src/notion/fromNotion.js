import { Client } from "@notionhq/client"
import fs from "fs"

const notion = new Client({
    auth: process.env.NOTION_TOKEN,
})

let database_id = process.env.NOTION_DATABASE_ID
const __dirname = new URL(".", import.meta.url).pathname

// let items = await fromNotion()

export async function fromNotion() {
    if (!process.env.NOTION_TOKEN || !database_id) {
        console.log("[notion] skipped: set NOTION_TOKEN and NOTION_DATABASE_ID to enable import.")
        return {}
    }

    let lines = {}
    const subTypeMap = {
        普通: "normal",
        风格: "style",
        质量: "quality",
        命令: "command",
        负面: "eg",
    }

    console.log("[notion] importing configured database")
    let i = 0
    await once()
    async function once(start_cursor) {
        let re = await notion.databases.query({ database_id, start_cursor })
        console.log(`[notion] get page${i} :${start_cursor ?? "init"}`)
        re.results.forEach((page) => {
            let text = page.properties.text.title?.[0]?.text?.content
            let desc = page.properties.desc.rich_text?.[0]?.text?.content
            let lang_zh = page.properties["lang_zh"].rich_text?.[0]?.text?.content
            let tags = page.properties.tags?.multi_select?.map((x) => x.name)
            let subType = page.properties.subType?.select?.name
            let dir = page.properties.dir?.select?.name
            subType = subTypeMap[subType] ?? "normal"
            let item = { text, desc, lang_zh, subType, dir, tags }
            if (!text) return
            // console.log("item",item)
            lines[item.text.toLowerCase()] = item
        })

        if (re.has_more) {
            await once(re.next_cursor)
        }
    }

    console.log(`[notion] import ${Object.keys(lines).length} items.`)
    fs.writeFileSync(`${__dirname}notionPromptDescMap.json`, JSON.stringify(lines, null, 2))
    return lines
}
