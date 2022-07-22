const { gql } = require("apollo-server-express");

const typeDefs = gql`
    type Product {
        id: ID
        name: String
        image: String
        description: String
    }

    #ROOT TYPE
    type Query {
        products: [Product]
    }
`

module.exports = typeDefs;
