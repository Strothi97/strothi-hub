import fs from 'fs/promises'
import path from 'path'
import Handlebars from 'handlebars'

const templatesDir = path.join(__dirname, '..', '..', 'templates')

export async function render<T extends object>(templateName: string, context: T): Promise<string> {
  const filePath = path.join(templatesDir, `${templateName}.hbs`)
  const source = await fs.readFile(filePath, 'utf8')
  const template = Handlebars.compile(source)
  return template(context)
}
