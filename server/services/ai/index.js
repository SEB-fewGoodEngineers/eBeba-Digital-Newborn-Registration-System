// AI SERVICE – STUB WITH A MOCK PROVIDER
// Owner: AI service (Epic 3), tasks AI1–AI3.
// The only code that talks to an AI provider. The function name and result shape are final.
// TODO AI1: choose the provider from .env (AI_PROVIDER), check answers with Zod,
//           time out after 15 seconds, and return { available: false } on any problem.
// TODO AI3: add the real provider once the instructor chooses it.

/**
 * @param {string} kind   AI_SUGGESTION_KINDS value, e.g. "registration_precheck"
 * @param {object} input  only the fields the AI needs (synthetic data only)
 * @returns {Promise<{ available: boolean, provider: string, model?: string,
 *                     flags: { field: string, message: string }[] }>}
 */
// eslint-disable-next-line no-unused-vars
const suggest = async (kind, input) => ({
  available: true,
  provider: "mock",
  model: "mock-1",
  flags: [
    {
      field: "proposedLastName",
      message:
        'The proposed last name "Vukovic" is very close to the parents\' last name "Vuković". It may be missing the letter "ć".',
    },
  ],
});

module.exports = { suggest };
