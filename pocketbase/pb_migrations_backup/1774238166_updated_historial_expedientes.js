/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1009099602")

  // add field
  collection.fields.addAt(1, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_1871982853",
    "hidden": false,
    "id": "relation3583812627",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "expediente",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(2, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_3556118385",
    "hidden": false,
    "id": "relation2411227353",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "modificado_por",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(3, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text2315445172",
    "max": 0,
    "min": 0,
    "name": "accion",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": true,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(4, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text1210299187",
    "max": 0,
    "min": 0,
    "name": "estado_anterior",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(5, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text1548632863",
    "max": 0,
    "min": 0,
    "name": "estado_nuevo",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(6, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text1029162715",
    "max": 0,
    "min": 0,
    "name": "detalles",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1009099602")

  // remove field
  collection.fields.removeById("relation3583812627")

  // remove field
  collection.fields.removeById("relation2411227353")

  // remove field
  collection.fields.removeById("text2315445172")

  // remove field
  collection.fields.removeById("text1210299187")

  // remove field
  collection.fields.removeById("text1548632863")

  // remove field
  collection.fields.removeById("text1029162715")

  return app.save(collection)
})
