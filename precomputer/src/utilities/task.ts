import { PromisePoolError } from '@supercharge/promise-pool'
import { uploadRfcData } from '../tasks/rfc.ts'
import { logUnpdfStats } from './unpdf-parent.ts'

/**
 * Use taskItemWasSuccessful() and taskItemWasSkipped() to analyse results
 */
export type TaskItem = (string | false)[]

/**
 * Use taskItemWasSuccessful() and taskItemWasSkipped() to analyse results
 */
export type AsyncTaskItem = Promise<TaskItem>

export const taskItemWasSuccessful = (taskItem: TaskItem): boolean =>
  taskItem.length > 0 && taskItem.every((result) => result !== false)

export const taskItemWasSkipped = (taskItem: TaskItem): boolean => taskItem.length === 0

export const taskItemHadErrors = (taskItem: TaskItem): boolean => !taskItemWasSuccessful(taskItem)

export type UploadResult = [
  number, // rfc number
  TaskItem
]

type ProcessExitFromUploadResultsProps = {
  filename: string
  uploadResults: UploadResult[]
  exceptions: PromisePoolError<
    number, // rfc number of exception
    any // the exception
  >[]
}

const NUMBER_OF_RFC_UPLOAD_ATTEMPTS = 3

export const processRfcUploadTask = async (rfcNumber: number): Promise<UploadResult> => {
  let taskItem: TaskItem | undefined = undefined
  let attemptsRemaining = NUMBER_OF_RFC_UPLOAD_ATTEMPTS
  let errors: unknown[] = []
  while (attemptsRemaining--) {
    try {
      taskItem = await uploadRfcData(rfcNumber)
      if (taskItemWasSkipped(taskItem)) {
        console.log(`[RFC ${rfcNumber}] Skipped.`)
        return [rfcNumber, taskItem]
      } else if (taskItemWasSuccessful(taskItem)) {
        console.log(`[RFC ${rfcNumber}] upload succeeded`)
        return [rfcNumber, taskItem]
      } else if (taskItemHadErrors(taskItem)) {
        console.log(`[RFC ${rfcNumber}] had errors so trying again (${attemptsRemaining} attempts remaining)`)
      }
    } catch (err) {
      console.log(
        `[RFC ${rfcNumber}] threw exception so trying again (${attemptsRemaining} attempts remaining). Exception was:`,
        err
      )
      errors.push(err)
    }
  }
  console.error(`[RFC ${rfcNumber}] upload failed after ${NUMBER_OF_RFC_UPLOAD_ATTEMPTS} reattempts`)
  throw Error('')
}

export const processExitFromUploadResults = ({
  filename,
  uploadResults,
  exceptions
}: ProcessExitFromUploadResultsProps): void => {
  const uploadResultsWithErrors = uploadResults
    .filter(([_rfcNumber, taskItem]) => {
      if (taskItemWasSkipped(taskItem)) {
        return false
      }
      return !taskItemWasSuccessful(taskItem)
    })
    .sort((a, b) => a[0] - b[0])

  const hasExceptions = exceptions.length > 0
  const hasErrors = uploadResultsWithErrors.length > 0

  if (!(hasExceptions || hasErrors)) {
    console.log(`[${filename}] finished successfully`)
    logUnpdfStats()
    process.exit(0)
  }

  console.error(
    `[${filename}] finished with ${[hasExceptions ? 'exceptions thrown' : undefined, hasErrors ? 'errors' : undefined]
      .filter(Boolean)
      .join(', ')}.`
  )
  logUnpdfStats()

  if (hasExceptions) {
    console.error(...stringifyExceptions(exceptions))
  }

  if (hasErrors) {
    console.error(
      uploadResultsWithErrors
        .map(([rfcNumber, taskItem]) => {
          return `RFC ${rfcNumber}: ${stringifyTaskItemErrors(taskItem)}`
        })
        .join('. ')
    )
  }

  process.exit(1)
}

const stringifyExceptions = (exceptions: ProcessExitFromUploadResultsProps['exceptions']): string[] => {
  return exceptions.flatMap((exception): string[] => {
    if (exception instanceof PromisePoolError) {
      const { item: rfcNumber, name, raw } = exception
      const errorTitle = `RFC ${rfcNumber} exception:`
      if (raw instanceof AggregateError) {
        return [errorTitle, name, ...raw.errors.map((error) => String(error))]
      }
      return [errorTitle, name, String(raw)]
    }
    return [String(exception)]
  })
}

/**
 * stringifies and returns indexes of errors
 */
const stringifyTaskItemErrors = (taskItem: TaskItem): string => {
  if (taskItemWasSuccessful(taskItem)) {
    const errorTitle = 'stringifyTaskItemErrors should only receive a task with errors.'
    console.error(errorTitle, JSON.stringify(taskItem))
    throw Error(errorTitle)
  }

  return taskItem
    .map((job, index) => (job === false ? index : undefined))
    .filter((index) => index !== undefined)
    .join(', ')
}
