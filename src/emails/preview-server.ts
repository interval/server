import express from 'express'
import path from 'path'
import fs from 'fs'

const PORT = 3008

const app = express()

function getTemplates() {
  const files = fs.readdirSync(__dirname)

  const folders = files.filter(f => {
    const fileStat = fs.lstatSync(path.join(__dirname, f))
    return fileStat.isDirectory()
  })

  return folders
}

app.get('/:template?', async (req, res) => {
  const templates = getTemplates()

  const templateSlug = req.params.template || templates[0]

  const fn = await import(`./${templateSlug}/preview`)
  const { htmlTmpFile } = await fn.default
  const previewHtml = fs.readFileSync(
    htmlTmpFile.replace('file://', ''),
    'utf8'
  )

  const selectTemplateBox = `
    <div style="background: #eee; padding: 8px;">
      Select a template:
      <select onchange="location = this.value;">
        <option value="">Select a template</option>
        ${templates.map(template => {
          return `<option value="${template}" ${
            template === templateSlug ? 'selected' : ''
          }>${template}</option>`
        })}
      </select>
    </div>
  `

  const html = [selectTemplateBox, previewHtml]

  return res.status(200).send(html.join('\n'))
})

app.listen(PORT, () => {
  console.log(`📫 Email preview server running: http://localhost:${PORT}`)
})
