import { type RfcCommon } from "../../../website/app/utilities/rfc-validators.ts";
import { EDITOR_SUFFIX, formatAuthor, type FormatAuthorStyle } from "./rfc-converters-utils.ts";
import { escapeRegExp } from "./string.ts";

const editorSuffixRegex = new RegExp(`${escapeRegExp(EDITOR_SUFFIX)}$`)

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