/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3556118385")

  // update field
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
      "REGISTRADOR",
      "ENTREGADOR",
      "OPERADOR",
      "SUP_IMPRESION",
      "SUP_CALIDAD"
    ]
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3556118385")

  // update field
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
      "REGISTRADOR",
      "ENTREGADOR"
    ]
  }))

  return app.save(collection)
})
