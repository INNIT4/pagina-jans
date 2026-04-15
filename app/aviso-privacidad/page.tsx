import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aviso de Privacidad",
  description: "Aviso de privacidad de Sorteos Jans conforme a la LFPDPPP.",
  alternates: { canonical: "https://www.sorteosjans.com.mx/aviso-privacidad" },
};

export default function AvisoPrivacidadPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold uppercase tracking-widest mb-2">Aviso de Privacidad</h1>
      <span className="accent-bar" />
      <p className="text-gray-500 mb-10 text-sm mt-4">
        Última actualización: Marzo 2026
      </p>

      <div className="max-w-none space-y-8 text-sm leading-relaxed text-gray-300">

        <section>
          <h2 className="text-xl font-bold mb-3 text-white uppercase tracking-wider">Identidad y domicilio del responsable</h2>
          <p>
            <strong className="text-white">Sorteos Jans</strong> (en adelante &ldquo;el Responsable&rdquo;) es responsable del tratamiento de los datos
            personales que nos proporcione, de conformidad con la <em>Ley Federal de Protección de Datos Personales
            en Posesión de los Particulares</em> (LFPDPPP) y su Reglamento.
          </p>
          <p className="mt-3 text-gray-400">
            Para cualquier asunto relacionado con sus datos personales puede contactarnos en:{" "}
            <a href="mailto:contacto@sorteosjans.com.mx" className="text-brand-red hover:underline">
              contacto@sorteosjans.com.mx
            </a>
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-white uppercase tracking-wider">Datos personales recabados</h2>
          <p>Para llevar a cabo las finalidades descritas en el presente aviso de privacidad, recabamos los siguientes datos personales:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1 text-gray-400">
            <li>Nombre y apellidos</li>
            <li>Número de teléfono celular</li>
            <li>Estado de residencia (dentro de la República Mexicana)</li>
          </ul>
          <p className="mt-3">No recabamos datos personales sensibles.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-white uppercase tracking-wider">Finalidades del tratamiento</h2>
          <p><strong className="text-white">Finalidades primarias (necesarias para la relación jurídica):</strong></p>
          <ul className="list-disc pl-6 mt-2 space-y-1 text-gray-400">
            <li>Registrar la adquisición de boletos para rifas y sorteos.</li>
            <li>Enviar confirmación de apartado y folio por WhatsApp.</li>
            <li>Identificar al titular del boleto en caso de resultar ganador.</li>
            <li>Atender consultas sobre el estado de su boleto.</li>
          </ul>
          <p className="mt-3"><strong className="text-white">Finalidades secundarias (puede oponerse):</strong></p>
          <ul className="list-disc pl-6 mt-2 space-y-1 text-gray-400">
            <li>Envío de información sobre nuevas rifas y promociones.</li>
            <li>Análisis de comportamiento en el sitio web mediante Microsoft Clarity (herramienta de analítica que puede registrar grabaciones de sesión y mapas de calor de navegación).</li>
          </ul>
          <p className="mt-3">
            Si no desea que sus datos sean tratados para las finalidades secundarias, puede comunicarlo a{" "}
            <a href="mailto:contacto@sorteosjans.com.mx" className="text-brand-red hover:underline">
              contacto@sorteosjans.com.mx
            </a>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-white uppercase tracking-wider">Transferencias de datos</h2>
          <p>
            Sus datos personales <strong className="text-white">no son transferidos</strong> a terceros sin su consentimiento, salvo en los
            casos previstos en el artículo 37 de la LFPDPPP (autoridades competentes que así lo requieran).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-white uppercase tracking-wider">Derechos ARCO</h2>
          <p>
            Usted tiene derecho a <strong className="text-white">Acceder</strong>, <strong className="text-white">Rectificar</strong>, <strong className="text-white">Cancelar</strong> u
            <strong className="text-white"> Oponerse</strong> al tratamiento de sus datos personales (derechos ARCO). Para ejercerlos, puede
            enviar su solicitud a{" "}
            <a href="mailto:contacto@sorteosjans.com.mx" className="text-brand-red hover:underline">
              contacto@sorteosjans.com.mx
            </a>{" "}indicando:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-1 text-gray-400">
            <li>Nombre completo y folio de boleto (si aplica).</li>
            <li>Descripción clara del derecho que desea ejercer.</li>
            <li>Copia de identificación oficial.</li>
          </ul>
          <p className="mt-3">
            Responderemos su solicitud en un plazo máximo de <strong className="text-white">20 días hábiles</strong>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-white uppercase tracking-wider">Cookies y tecnologías de rastreo</h2>
          <p>
            Este sitio utiliza cookies de sesión estrictamente necesarias para el funcionamiento del panel de
            administración. Adicionalmente, utilizamos <strong className="text-white">Microsoft Clarity</strong>, una herramienta de
            analítica web que puede recopilar datos de comportamiento del usuario (grabaciones de sesión, mapas de
            calor) con el fin de mejorar la experiencia de navegación. Puede conocer más sobre las prácticas de
            privacidad de Microsoft Clarity en{" "}
            <a href="https://privacy.microsoft.com/privacystatement" target="_blank" rel="noopener noreferrer" className="text-brand-red hover:underline">
              privacy.microsoft.com
            </a>.
          </p>
          <p className="mt-3">
            Si desea oponerse al uso de Microsoft Clarity, puede comunicarlo a{" "}
            <a href="mailto:contacto@sorteosjans.com.mx" className="text-brand-red hover:underline">
              contacto@sorteosjans.com.mx
            </a>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-white uppercase tracking-wider">Cambios al aviso de privacidad</h2>
          <p>
            Nos reservamos el derecho de modificar el presente aviso de privacidad en cualquier momento. Los cambios
            serán publicados en esta misma página, indicando la fecha de última actualización.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-white uppercase tracking-wider">Contacto</h2>
          <p>
            Para cualquier duda o solicitud relacionada con sus datos personales, puede contactarnos a:{" "}
            <a href="mailto:contacto@sorteosjans.com.mx" className="text-brand-red hover:underline">
              contacto@sorteosjans.com.mx
            </a>{" "}o a través del botón de WhatsApp disponible en el sitio.
          </p>
        </section>

      </div>
    </div>
  );
}
