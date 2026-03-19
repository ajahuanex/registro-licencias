/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": "@request.auth.id != ''",
    "deleteRule": null,
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "hidden": false,
        "id": "text3208210256",
        "max": 15,
        "min": 15,
        "name": "id",
        "pattern": "^[a-z0-9]+$",
        "presentable": false,
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      },
      {
        "cascadeDelete": false,
        "collectionId": "pbc_3556118385",
        "hidden": false,
        "id": "relation3414164721",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "operador",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text3312824221",
        "max": 0,
        "min": 0,
        "name": "apellidos_nombres",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
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
      },
      {
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
      },
      {
        "hidden": false,
        "id": "select1246540570",
        "maxSelect": 1,
        "name": "lugar_entrega",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "Puno",
          "Juliaca"
        ]
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text3253969534",
        "max": 0,
        "min": 0,
        "name": "observaciones",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "date3425930059",
        "max": "",
        "min": "",
        "name": "fecha_registro",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "date"
      }
    ],
    "id": "pbc_1871982853",
    "indexes": [],
    "listRule": "@request.auth.id != ''",
    "name": "expedientes",
    "system": false,
    "type": "base",
    "updateRule": "@request.auth.id != ''",
    "viewRule": "@request.auth.id != ''"
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1871982853");

  return app.delete(collection);
})
