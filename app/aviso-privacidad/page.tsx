import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aviso de Privacidad",
  description: "Aviso de privacidad de Sorteos Jans conforme a la LFPDPPP.",
};

export default function AvisoPrivacidadPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-black mb-2">Aviso de Privacidad</h1>
      <p className="text-slate-500 dark:text-slate-400 mb-10 text-sm">
        Última actualización: {new Date().toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })}
      </p>

      <div className="prose prose-slate dark:prose-invert max-w-none space-y-8 text-sm leading-relaxed text-slate-700 dark:text-slate-300">

        <section>
          <h2 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">Identidad y domicilio del responsable</h2>
          <p>
            <strong>Sorteos Jans</strong> (en adelante &ldquo;el Responsable&rdquo;) es responsable del tratamiento de los datos
            personales que nos proporcione, de conformidad con la <em>Ley Federal de Protección de Datos Personales
            en Posesión de los Particulares</em> (LFPDPPP) y su Reglamento.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">Datos personales recabados</h2>
          <p>Para llevar a cabo las finalidades descritas en el presente aviso de privacidad, recabamos los siguientes datos personales:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Nombre y apellidos</li>
            <li>Número de teléfono celular</li>
            <li>Estado de residencia (dentro de la República Mexicana)</li>
          </ul>
          <p className="mt-3">No recabamos datos personales sensibles.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">Finalidades del tratamiento</h2>
          <p><strong>Finalidades primarias (necesarias para la relación jurídica):</strong></p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Registrar la adquisición de boletos para rifas y sorteos.</li>
            <li>Enviar confirmación de apartado y folio por WhatsApp.</li>
            <li>Identificar al titular del boleto en caso de resultar ganador.</li>
            <li>Atender consultas sobre el estado de su boleto.</li>
          </ul>
          <p className="mt-3"><strong>Finalidades secundarias (puede oponerse):</strong></p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Envío de información sobre nuevas rifas y promociones.</li>
          </ul>
          <p className="mt-3">
            Si no desea que sus datos sean tratados para las finalidades secundarias, puede comunicarlo a través del
            correo indicado en la sección de contacto.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">Transferencias de datos</h2>
          <p>
            Sus datos personales <strong>no son transferidos</strong> a terceros sin su consentimiento, salvo en los
            casos previstos en el artículo 37 de la LFPDPPP (autoridades competentes que así lo requieran).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">Derechos ARCO</h2>
          <p>
            Usted tiene derecho a <strong>Acceder</strong>, <strong>Rectificar</strong>, <strong>Cancelar</strong> u
            <strong> Oponerse</strong> al tratamiento de sus datos personales (derechos ARCO). Para ejercerlos, puede
            enviar su solicitud a través de WhatsApp o al correo de contacto indicando:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Nombre completo y folio de boleto (si aplica).</li>
            <li>Descripción clara del derecho que desea ejercer.</li>
            <li>Copia de identificación oficial.</li>
          </ul>
          <p className="mt-3">
            Responderemos su solicitud en un plazo máximo de <strong>20 días hábiles</strong>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">Cookies y tecnologías de rastreo</h2>
          <p>
            Este sitio utiliza cookies de sesión estrictamente necesarias para el funcionamiento del panel de
            administración. No utilizamos cookies de rastreo publicitario ni herramientas de análisis de terceros
            que recopilen datos personales.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">Cambios al aviso de privacidad</h2>
          <p>
            Nos reservamos el derecho de modificar el presente aviso de privacidad en cualquier momento. Los cambios
            serán publicados en esta misma página, indicando la fecha de última actualización.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">Contacto</h2>
          <p>
            Para cualquier duda o solicitud relacionada con sus datos personales, puede contactarnos a través del
            botón de WhatsApp disponible en el sitio.
          </p>
        </section>

      </div>
    </div>
  );
}
