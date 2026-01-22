import { uploadRfcData } from './tasks/rfc.ts'

const main = async (rfcNumber: number): Promise<void> => {
  console.log(`Processing RFC ${rfcNumber}...`)
  try {
    const isDone = await uploadRfcData(rfcNumber)
    if (isDone) {
      console.log(`Pushed RFC ${rfcNumber} to bucket successfully.`)
    } else {
      console.error(`Unable to process RFC ${rfcNumber}`)
    }
  } catch (err: unknown) {
    if(err instanceof Error) {
      console.error(
        `Failed to process RFC ${rfcNumber}: `,
        err.message,
        err.stack
      )
    } else {
      console.error(`Failed to process RFC ${rfcNumber}:`, err)
    }
    throw err
  }
}

if (!process.argv[2]) {
  throw Error(
    `Script requires RFC Number arg but argv was ${JSON.stringify(
      process.argv
    )}`
  )
}

main(parseInt(process.argv[2], 10))
