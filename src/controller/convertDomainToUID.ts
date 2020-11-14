// Domain to uid
async function convertDomainToUID(ctx) {
  const domain = ctx.request.query['domain'];
  ctx.body = {
    success: 1,
    domain,
  };
}

export default convertDomainToUID;
