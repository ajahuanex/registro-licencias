/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1871982853")

  // add field
  collection.fields.addAt(8, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text2200854438",
    "max": 8,
    "min": 0,
    "name": "dni_solicitante",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": true,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(9, new Field({
    "hidden": false,
    "id": "select643686883",
    "maxSelect": 1,
    "name": "estado",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "select",
    "values": [
      "EN PROCESO",
      "ATENDIDO",
      "OBSERVADO",
      "RECHAZADO"
    ]
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1871982853")

  // remove field
  collection.fields.removeById("text2200854438")

  // remove field
  collection.fields.removeById("select643686883")

  return app.save(collection)
})
