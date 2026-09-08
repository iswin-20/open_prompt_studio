// @ts-ignore
import express from "express"
// @ts-ignore
import cors from "cors"
import * as dotenv from "dotenv"
import path from "path"
import { fileURLToPath } from "url"
import { translate } from "./translate"
dotenv.config()
const app = express()

app.use(express.json({ limit: "1mb" }))
app.use(cors())

const visualRecipeSchema = {
    type: "object",
    additionalProperties: false,
    required: ["title", "ratio", "mode", "values"],
    properties: {
        title: { type: "string" },
        ratio: { type: "string", enum: ["1:1", "4:3", "3:4", "16:9", "9:16", "3:2", "2:3"] },
        mode: { type: "string", enum: ["create", "edit"] },
        values: {
            type: "object",
            additionalProperties: false,
            required: ["subject", "scene", "style", "composition", "lighting", "text", "constraints", "reference"],
            properties: {
                subject: { type: "string" },
                scene: { type: "string" },
                style: { type: "string" },
                composition: { type: "string" },
                lighting: { type: "string" },
                text: { type: "string" },
                constraints: { type: "string" },
                reference: { type: "string" },
            },
        },
    },
}

app.post("/api/visual-recipe", async (req: any, res: any) => {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) return res.status(503).json({ error: "OPENAI_API_KEY is not configured" })

    const idea = typeof req.body?.idea === "string" ? req.body.idea.trim().slice(0, 20000) : ""
    if (!idea) return res.status(400).json({ error: "idea is required" })

    const requestContext = {
        idea,
        targetModel: req.body?.targetModel === "gpt" ? "gpt" : "gemini",
        mode: req.body?.mode === "edit" ? "edit" : "create",
        current: typeof req.body?.current === "object" && req.body.current ? req.body.current : {},
    }

    try {
        const response = await fetch("https://api.openai.com/v1/responses", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: process.env.OPENAI_MODEL || "gpt-5.6-luna",
                reasoning: { effort: "low" },
                store: false,
                instructions: [
                    "你是视觉提示词架构师。把用户的想法拆成可编辑、可执行的图像生成配方。",
                    "subject 写主体与动作；scene 写环境和空间关系；style 写媒介、材质和审美语言；composition 写机位、景别、焦点和留白；lighting 写光源、方向、色温与对比；text 只填写用户明确要求出现在画面里的逐字文字，没有则返回空字符串；constraints 写数量、结构、禁止项和真实性要求；reference 只写参考图的保留和修改规则，没有参考图则返回空字符串。",
                    "尊重原意，不擅自添加品牌、人物、文字、数据或版权角色。中文输入用简洁中文回答。根据用途选择合理画幅。标题控制在 24 个汉字以内。",
                ].join("\n"),
                input: JSON.stringify(requestContext),
                text: { format: { type: "json_schema", name: "visual_recipe", strict: true, schema: visualRecipeSchema } },
            }),
        })

        const data: any = await response.json()
        if (!response.ok) throw new Error(data?.error?.message || `OpenAI API returned ${response.status}`)
        const outputText = data.output_text || data.output?.flatMap((item: any) => item.content || []).find((item: any) => item.type === "output_text")?.text
        if (!outputText) throw new Error("The model returned no structured recipe")
        res.json({ recipe: JSON.parse(outputText), model: process.env.OPENAI_MODEL || "gpt-5.6-luna" })
    } catch (error: any) {
        console.error("visual recipe generation failed:", error?.message || error)
        res.status(502).json({ error: "Visual recipe generation failed" })
    }
})

app.post("/prompt-studio/translate/prompts", async (req: any, res: any) => {
    let input: { words: string[]; to: string } = req.body
    let orgText = input.words.join("\n")
    const finText = await translate({ text: orgText, to: input.to ?? "zh-cn", server: "tencent" })

    if (finText) {
        let words = finText.split("\n")
        res.json(words)
    } else {
        res.json([])
    }
})

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.resolve(currentDir, "../dist")
app.use(express.static(distDir))
app.get("*", (req: any, res: any, next: any) => {
    if (req.path.startsWith("/api/") || req.path.startsWith("/prompt-studio/")) return next()
    res.sendFile(path.join(distDir, "index.html"))
})

const port = Number(process.env.PORT || 39011)
app.listen(port, () => {
    console.log(`OpenPrompt Studio server started on http://127.0.0.1:${port}`)
})
