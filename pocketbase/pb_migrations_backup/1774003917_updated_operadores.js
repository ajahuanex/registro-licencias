/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3556118385")

  // add field
  collection.fields.addAt(10, new Field({
    "hidden": false,
    "id": "select714859217",
    "maxSelect": 1,
    "name": "sede",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "Puno",
      "Juliaca"
    ]
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3556118385")

  // remove field
  collection.fields.removeById("select714859217")

  return app.save(collection)
})
