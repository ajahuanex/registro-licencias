/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1871982853")

  // update field
  collection.fields.addAt(3, new Field({
    "hidden": false,
    "id": "select2670866213",
    "maxSelect": 1,
    "name": "tramite",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "select",
    "values": [
      "Obtención",
      "Revalidación",
      "Duplicado",
      "Recategorización"
    ]
  }))

  // update field
  collection.fields.addAt(4, new Field({
    "hidden": false,
    "id": "select1309676077",
    "maxSelect": 1,
    "name": "categoria",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "select",
    "values": [
      "A-I",
      "A-IIa",
      "A-IIb",
      "A-IIIa",
      "A-IIIb",
      "A-IIIc",
      "A-IV",
      "B-IIa",
      "B-IIb",
      "B-IIc"
    ]
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1871982853")

  // update field
  collection.fields.addAt(3, new Field({
    "hidden": false,
    "id": "select2670866213",
    "maxSelect": 1,
    "name": "tramite",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "select",
    "values": [
      "Duplicado",
      "Revalidación"
    ]
  }))

  // update field
  collection.fields.addAt(4, new Field({
    "hidden": false,
    "id": "select1309676077",
    "maxSelect": 1,
    "name": "categoria",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "select",
    "values": [
      "AI",
      "AIIA",
      "AIIB",
      "AIIIC"
    ]
  }))

  return app.save(collection)
})
