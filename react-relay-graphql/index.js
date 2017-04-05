import { graphql } from 'graphql'
import readline from 'readline'

import schema from './schema/main'

const rli = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

rli.question('Client Request: ', query => {
  graphql(schema, query).then(result => {
    console.log('Server Answer: ', result.data)
  })

  rli.close()
})
