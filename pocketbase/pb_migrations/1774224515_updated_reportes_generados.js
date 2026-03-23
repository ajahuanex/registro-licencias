/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_653606244")

  // add field
  collection.fields.addAt(9, new Field({
    "hidden": false,
    "id": "json743249205",
    "maxSize": 0,
    "name": "snapshot",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_653606244")

  // remove field
  collection.fields.removeById("json743249205")

  return app.save(collection)
})
