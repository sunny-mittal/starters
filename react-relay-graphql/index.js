import { graphql } from 'graphql'
import readline from 'readline'
import { MongoClient } from 'mongodb'
import assert from 'assert'
import schema from './schema/main'

const MONGO_URL = 'mongodb://localhost:27017/test'

MongoClient.connect(MONGO_URL, (err, db) => {
  assert.equal(null, err)
  console.log('Connected to MongoDB server')

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
})
