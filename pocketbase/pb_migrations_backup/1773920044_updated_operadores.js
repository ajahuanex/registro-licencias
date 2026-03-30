/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3556118385")

  // add field
  collection.fields.addAt(8, new Field({
    "hidden": false,
    "id": "select2523231815",
    "maxSelect": 1,
    "name": "perfil",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "select",
    "values": [
      "OTI",
      "ADMINISTRADOR",
      "SUPERVISOR",
      "REGISTRADOR"
    ]
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3556118385")

  // remove field
  collection.fields.removeById("select2523231815")

  return app.save(collection)
})
