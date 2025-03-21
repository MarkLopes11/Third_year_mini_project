/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("do6xsstmupnptuo")

  // update
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "6i3nprao",
    "name": "video_id",
    "type": "text",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": null,
      "max": null,
      "pattern": ""
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("do6xsstmupnptuo")

  // update
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "6i3nprao",
    "name": "video",
    "type": "text",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": null,
      "max": null,
      "pattern": ""
    }
  }))

  return dao.saveCollection(collection)
})
