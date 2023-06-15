import AbstractRepo from "./AbstractRepo";
import Localgroups from "../../lib/collections/localgroups/collection";

export type LocalgroupSearchDocument = DbLocalgroup & {
  objectID: string,
  publicDateMs: number,
  body: string,
  exportedAt: Date,
}

export default class LocalgroupsRepo extends AbstractRepo<DbLocalgroup> {
  constructor() {
    super(Localgroups);
  }

  moveUserLocalgroupsToNewUser(oldUserId: string, newUserId: string): Promise<null> {
    return this.none(`
      UPDATE "Localgroups"
      SET "organizerIds" = ARRAY_APPEND(ARRAY_REMOVE("organizerIds", $1), $2)
      WHERE ARRAY_POSITION("organizerIds", $1) IS NOT NULL
    `, [oldUserId, newUserId]);
  }

  private getSearchDocumentQuery(): string {
    return `
      SELECT
        l."_id",
        l."_id" AS "objectID",
        l."name",
        l."nameInAnotherLanguage",
        l."organizerIds",
        l."lastActivity",
        l."types",
        l."categories",
        COALESCE(l."isOnline", FALSE) AS "isOnline",
        l."mongoLocation",
        l."googleLocation",
        l."location",
        l."contactInfo",
        l."facebookLink",
        l."facebookPageLink",
        l."meetupLink",
        l."slackLink",
        l."website",
        l."bannerImageId",
        COALESCE(l."inactive", FALSE) AS "inactive",
        COALESCE(l."deleted", FALSE) AS "deleted",
        l."salesforceId",
        l."createdAt",
        EXTRACT(EPOCH FROM l."createdAt") * 1000 AS "publicDateMs",
        l."contents"->>'html' AS "body",
        NOW() AS "exportedAt"
      FROM "Localgroups" l
    `;
  }

  getSearchDocumentById(id: string): Promise<LocalgroupSearchDocument> {
    return this.getRawDb().one(`
      ${this.getSearchDocumentQuery()}
      WHERE l."_id" = $1
    `, [id]);
  }

  getSearchDocuments(limit: number, offset: number): Promise<LocalgroupSearchDocument[]> {
    return this.getRawDb().any(`
      ${this.getSearchDocumentQuery()}
      ORDER BY l."createdAt" DESC
      LIMIT $1
      OFFSET $2
    `, [limit, offset]);
  }

  async countSearchDocuments(): Promise<number> {
    const {count} = await this.getRawDb().one(`SELECT COUNT(*) FROM "Localgroups"`);
    return count;
  }
}
