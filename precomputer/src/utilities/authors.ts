import { type RfcCommon } from "../../../website/app/utilities/rfc-validators.ts";
import { EDITOR_SUFFIX, formatAuthor, type FormatAuthorStyle } from "./rfc-converters-utils.ts";

if (
  // @ts-ignore TS thinks .escape doesn't exist but it should
  !RegExp.escape
) {
  throw Error('Expected RegExp.escape() to exist')
}

const editorSuffixRegex = new RegExp(`${
  // @ts-ignore TS thinks .escape doesn't exist but it does
  RegExp.escape(EDITOR_SUFFIX)}$`
)

/**
 * Formats authors per Chicago style guide and
 * https://www.rfc-editor.org/styleguide/part2/#ref_rfcs
 * https://www.rfc-editor.org/authors/rfc-style-guide/
 */
export const formatAuthorsPerStyleGuide = (authors: RfcCommon["authors"], formatAuthorStyle: FormatAuthorStyle = 'brief'): string => {
  return authors.map((author, index, arr) => {
    const formattedName = formatAuthor(author, formatAuthorStyle)
    const hasTwoAuthors = arr.length === 2
    const hasMultipleAuthors = arr.length > 1

    // The last author has its name reversed    
    const reversedName = author.is_editor
      ? formattedName.replace(editorSuffixRegex, '').split(/\s+/g).reverse().join(' ').replace(/,$/, '') + ', Ed.'
      : formattedName.split(/\s+/g).reverse().join(' ').replace(/,$/, '')

    const isLast = index === arr.length - 1
    const isSecondToLast = index === arr.length - 2

    return `${isLast && hasMultipleAuthors ? reversedName : formattedName
      }${isLast
        ? ''
        : isSecondToLast
          ? hasTwoAuthors ? ' and ' :
            ', and '
          : ', '
      }`
  }).join('')
}