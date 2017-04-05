import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
  GraphQLInt,
  GraphQLList
} from 'graphql'

const roll = () => Math.floor(6 * Math.random()) + 1

const queryType = new GraphQLObjectType({
  name: 'RootQuery',
  fields: {
    hello: {
      type: GraphQLString,
      resolve: () => 'world'
    },
    diceRoll: {
      type: new GraphQLList(GraphQLInt),
      args: {
        count: { type: GraphQLInt, defaultValue: 2 }
      },
      resolve: (a, args) => {
        let rolls = []
        for (let i = 0; i < args.count; i++) rolls.push(roll())
        return rolls
      }
    }
  }
})

const schema = new GraphQLSchema({ query: queryType })
export default schema
