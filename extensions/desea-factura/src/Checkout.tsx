import {
  reactExtension,
  Banner,
  BlockStack,
  Checkbox,
  TextField,
  useApi,
  useApplyAttributeChange,
  useInstructions,
  useTranslate,
} from "@shopify/ui-extensions-react/checkout";
import { useState } from "react";

// 1. Choose an extension target
export default reactExtension("purchase.checkout.delivery-address.render-after", () => (
  <Extension />
));

function Extension() {
  const translate = useTranslate();
  const { extension } = useApi();
  const instructions = useInstructions();
  const applyAttributeChange = useApplyAttributeChange();

  // Estado para controlar si se solicita factura
  const [requestInvoice, setRequestInvoice] = useState(false);
  const [companyRut, setCompanyRut] = useState("");
  const [companyName, setCompanyName] = useState("");

  // 2. Check instructions for feature availability, see https://shopify.dev/docs/api/checkout-ui-extensions/apis/cart-instructions for details
  if (!instructions.attributes.canUpdateAttributes) {
    // For checkouts such as draft order invoices, cart attributes may not be allowed
    // Consider rendering a fallback UI or nothing at all, if the feature is unavailable
    return (
      <Banner title="¿Desea factura?" status="warning">
        {translate("attributeChangesAreNotSupported")}
      </Banner>
    );
  }

  // 3. Render a UI
  return (
    <BlockStack spacing="base">
      <Checkbox onChange={onInvoiceCheckboxChange}>
        {translate("wouldYouLikeAnInvoice")}
      </Checkbox>

      {requestInvoice && (
        <BlockStack spacing="base">
          <TextField
            label={translate("companyRut")}
            value={companyRut}
            onChange={onRutChange}
          />
          <TextField
            label={translate("companyName")}
            value={companyName}
            onChange={onCompanyNameChange}
          />
        </BlockStack>
      )}
    </BlockStack>
  );

  async function onInvoiceCheckboxChange(isChecked) {
    setRequestInvoice(isChecked);
    
    // 5. Call the API to modify checkout for invoice request
    const result = await applyAttributeChange({
      key: "solicitudFactura",
      type: "updateAttribute",
      value: isChecked ? "yes" : "no",
    });
    
    // Si se desmarca el checkbox, limpiar los campos de RUT y razón social
    if (!isChecked) {
      setCompanyRut("");
      setCompanyName("");
      // Limpiar también los atributos en el checkout
      await applyAttributeChange({
        key: "rutEmpresa",
        type: "updateAttribute",
        value: "",
      });
      await applyAttributeChange({
        key: "razonSocial",
        type: "updateAttribute",
        value: "",
      });
    }
  }
  
  async function onRutChange(value) {
    setCompanyRut(value);
    // Guardar el RUT como atributo del checkout
    const result = await applyAttributeChange({
      key: "rutEmpresa",
      type: "updateAttribute",
      value: value,
    });
  }
  
  async function onCompanyNameChange(value) {
    setCompanyName(value);
    // Guardar la razón social como atributo del checkout
    const result = await applyAttributeChange({
      key: "razonSocial",
      type: "updateAttribute",
      value: value,
    });
  }
}