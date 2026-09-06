/**
 * Tenant Plugin for Mongoose
 * Automatically scopes queries by business when tenant context is provided.
 * Usage: schema.plugin(tenantPlugin)
 * 
 * To bypass for SuperAdmin: query.setOptions({ skipTenant: true })
 */
function tenantPlugin(schema) {
  // Add business index if schema has business path
  if (schema.path("business")) {
    // compound index helper not auto, but ensure basic index
    // schema.index({ business: 1 }); // individual models should define compound as needed
  }

  function addTenantFilter() {
    const opts = this.getOptions();
    if (opts.skipTenant) return;
    // only auto-add if business not already in query and we have a tenant value stashed
    // We rely on controller to pass business explicitly, but this is a safety layer
    // If this.getQuery() already has business, do nothing
    const q = this.getQuery();
    if (q.business !== undefined) return;
    // Try to get from this.getOptions().tenantId if was set via .setOptions({ tenantId })
    const tenantId = opts.tenantId;
    if (tenantId) {
      this.where({ business: tenantId });
    }
  }

  schema.pre(/^find/, addTenantFilter);
  schema.pre("countDocuments", addTenantFilter);
  schema.pre("estimatedDocumentCount", function (next) {
    // do not scope estimated
    next();
  });
  schema.pre("aggregate", function (next) {
    const opts = this.options || {};
    if (opts.skipTenant) return next();
    const tenantId = opts.tenantId;
    if (tenantId && this.pipeline().length > 0) {
      // prepend match stage
      const first = this.pipeline()[0];
      if (!(first && first.$match && first.$match.business)) {
        this.pipeline().unshift({ $match: { business: tenantId } });
      }
    }
    next();
  });
}

module.exports = tenantPlugin;
