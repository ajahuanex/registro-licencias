/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1871982853")

  // update field
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
      "RECHAZADO",
      "ENTREGADO",
      "ANULADO",
      "VERIFICADO",
      "IMPRESO"
    ]
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1871982853")

  // update field
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
      "RECHAZADO",
      "ENTREGADO",
      "ANULADO",
      "VERIFICADO"
    ]
  }))

  return app.save(collection)
})
