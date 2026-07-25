import type { Metadata } from "next";
import { ImportForm } from "./import-form";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Importar inscrições — Meus Canais",
};

export default function ImportPage() {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Importar inscrições</h1>
      <p className={styles.subtitle}>
        Sem login, sem OAuth — só o export que o próprio Google já te dá.
      </p>

      <ol className={styles.steps}>
        <li>
          Acesse{" "}
          <a
            href="https://takeout.google.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            takeout.google.com
          </a>
          .
        </li>
        <li>Clique em &quot;Desmarcar tudo&quot; e marque só &quot;YouTube e YouTube Music&quot;.</li>
        <li>
          Clique em &quot;Todos os dados do YouTube incluídos&quot;, desmarque tudo e
          deixe só <strong>Inscrições</strong> marcado.
        </li>
        <li>Exporte, baixe o .zip quando o Google avisar que ficou pronto.</li>
        <li>
          Dentro do .zip, ache{" "}
          <code>Takeout/YouTube and YouTube Music/subscriptions/subscriptions.csv</code>{" "}
          e sobe ele abaixo.
        </li>
      </ol>

      <ImportForm />
    </main>
  );
}
