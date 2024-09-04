import { FieldValue, Firestore } from "firebase-admin/firestore";

export async function migrate(firestore: Firestore) {
  await migrateSkillMatrices();
  await migrateEvaluations();

  async function migrateSkillMatrices() {
    //migrate skillmatrix competencies and create scale
    const matrixDocs = await firestore
      .collection("skillMatrix")
      .listDocuments();

    Promise.all(
      matrixDocs.map(async (matrixDoc) => {
        const matrix = await matrixDoc.get();
        if (
          !matrix.data().competencies ||
          matrix.data().competencies.length === 0
        ) {
          return;
        }
        const competencyDocs = await Promise.all(
          matrix
            .data()
            .competencies.map(async (competencyRef) => competencyRef.get())
        );
        const competencies = competencyDocs
          .filter((competencyDoc) => !!competencyDoc)
          .map((c) => c.data());

        await matrixDoc.update({
          scale: competencies.map((c) => {
            if (!c) {
              return undefined;
            }
            return {
              description: c.description,
              value: c.value,
              riskMapping: c.value,
            };
          }),
          competencies: FieldValue.delete(),
        });
      })
    );
  }

  async function migrateEvaluations() {
    //migrate evaluation competencies and create scale values instead
    const evaluationDocs = await firestore
      .collection("evaluation")
      .listDocuments();

    await Promise.all(
      evaluationDocs.map(async (evaluationDoc) => {
        const skillEvaluationDocs = await evaluationDoc
          .collection("skillEvaluation")
          .listDocuments();

        await Promise.all(
          skillEvaluationDocs.map(async (skillEvaluationDoc) => {
            const skillEvaluation = await skillEvaluationDoc.get();
            if (!skillEvaluation.data().competencyRef) {
              return;
            }
            const competencyDoc = await skillEvaluation
              .data()
              .competencyRef.get();
            if (!competencyDoc.exists) {
              return;
            }
            const competency = competencyDoc.data();

            await skillEvaluationDoc.update({
              scaleValue: {
                description: competency.description,
                value: competency.value,
                riskMapping: competency.value,
              },
              competencyRef: FieldValue.delete(),
            });
          })
        );
      })
    );
  }
}
