import {
  GraphQLSchema,
  GraphQLObjectType
} from 'graphql'

const queryType = new GraphQLObjectType({
  name: 'RootQuery',
  fields: {}
})

const schema = new GraphQLSchema({ query: queryType })
export default schema

