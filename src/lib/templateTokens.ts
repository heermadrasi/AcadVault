/**
 * The admin does NOT get a blank HTML box. They get this fixed token
 * vocabulary. Anything outside it renders as literal text, which keeps
 * template authoring from turning into arbitrary code execution.
 */
export const TOKENS: { token: string; desc: string }[] = [
  { token: "{{faculty.full_name}}", desc: "Faculty name" },
  { token: "{{faculty.email}}", desc: "Institute email" },
  { token: "{{faculty.department}}", desc: "Department" },
  { token: "{{faculty.designation}}", desc: "Designation" },
  { token: "{{faculty.employee_code}}", desc: "Employee code" },
  { token: "{{report.generated_on}}", desc: "Date the report was built" },
  { token: "{{report.total_documents}}", desc: "Count of documents included" },
  { token: "{{#each categories}} … {{/each}}", desc: "Loop over document categories" },
  { token: "{{this.name}}", desc: "Category name (inside the categories loop)" },
  { token: "{{#each this.documents}} … {{/each}}", desc: "Loop over that category's documents" },
  { token: "{{this.title}}", desc: "Document title (inside the documents loop)" },
  { token: "{{this.uploaded_on}}", desc: "Date filed (inside the documents loop)" },
  { token: "{{this.task_title}}", desc: "Task it was filed against" },
  { token: "{{@index}}", desc: "Row number inside a loop" },
];

export const STARTER_TEMPLATE = `<div class="sheet">
  <header>
    <p class="inst">Manipal University Jaipur</p>
    <p class="dept">Department of Computer and Communication Engineering</p>
    <h1>Faculty Document Record</h1>
  </header>

  <table class="meta">
    <tr><th>Name</th><td>{{faculty.full_name}}</td></tr>
    <tr><th>Designation</th><td>{{faculty.designation}}</td></tr>
    <tr><th>Employee code</th><td>{{faculty.employee_code}}</td></tr>
    <tr><th>Generated on</th><td>{{report.generated_on}}</td></tr>
    <tr><th>Documents</th><td>{{report.total_documents}}</td></tr>
  </table>

  {{#each categories}}
  <section>
    <h2>{{this.name}}</h2>
    <table class="docs">
      <thead><tr><th>#</th><th>Document</th><th>Filed against</th><th>Date</th></tr></thead>
      <tbody>
        {{#each this.documents}}
        <tr>
          <td>{{@index}}</td>
          <td>{{this.title}}</td>
          <td>{{this.task_title}}</td>
          <td>{{this.uploaded_on}}</td>
        </tr>
        {{/each}}
      </tbody>
    </table>
  </section>
  {{/each}}

  <p class="sign">Signature of Faculty _______________ &nbsp;&nbsp; Head of Department _______________</p>
</div>

<style>
  body { font-family: "Times New Roman", serif; color: #16181D; }
  .inst { font-size: 15pt; font-weight: bold; text-align: center; margin: 0; }
  .dept { font-size: 11pt; text-align: center; margin: 2pt 0 14pt; }
  h1 { font-size: 13pt; text-align: center; text-transform: uppercase;
       letter-spacing: 1px; border-top: 1px solid #000; border-bottom: 1px solid #000;
       padding: 6pt 0; margin: 0 0 16pt; }
  table { width: 100%; border-collapse: collapse; font-size: 10pt; }
  .meta th { width: 130pt; text-align: left; padding: 3pt 0; font-weight: normal; color: #555; }
  .meta td { padding: 3pt 0; font-weight: bold; }
  h2 { font-size: 11pt; margin: 18pt 0 6pt; border-bottom: 1px solid #999; padding-bottom: 3pt; }
  .docs th, .docs td { border: 1px solid #bbb; padding: 4pt 6pt; text-align: left; }
  .docs th { background: #f0f0ee; font-size: 9pt; text-transform: uppercase; }
  .sign { margin-top: 40pt; font-size: 10pt; }
</style>`;
