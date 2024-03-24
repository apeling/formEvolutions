import { type UseFormReturnWithSections } from "./form.model";
import { AccompFormDef, SFA_FORM_LAYOUT } from "./formDefinition.configs";
import { Button, Card, Container, Stack, Typography } from "@mui/material";
import { ConfigForm, SubHeader } from "@timmons-group/shared-react-components";
import { FC, useCallback } from "react";
import { useFormContext } from "react-hook-form";
import { FormComponents } from "@components/FormParts";
import { Grant } from "@services/grants.service";
import { SFA_PROGRAMS_ARRAY } from "@constants";

type GrantFormProps = {
  grantData: Grant,
}

type ButtonAreaProps = {
  children?: React.ReactNode | React.ReactNode[] | string
}
const ButtonArea: FC<ButtonAreaProps> = ({ children }) => {
  return (
    <Stack spacing={2} direction="row" justifyContent="flex-end">
      <Button data-src-form-button="cancel" color={"regressive"} href="/grants">Cancel</Button>
      {children && children}
    </Stack>
  );
}

const GrantForm: FC<GrantFormProps> = ({ grantData }) => {
  const fpn = grantData.fields.fundingProgramName;
  const layout = SFA_PROGRAMS_ARRAY.includes(fpn) ? SFA_FORM_LAYOUT : undefined;

  const rightRender = useCallback(() => {
    if (!layout) {
      return (
        <ButtonArea />
      );
    }

    return (
      <FormButtonArea />
    )
  }, [layout]);

  const titleRender = useCallback(() => {
    const { fields } = grantData;
    return (
      <Stack>
        <Typography variant="subHeader">{fields.organizationName}/{fields.fundingProgramName}/{fields.fundingYearObject.alias}</Typography>
      </Stack>
    )
  }, [grantData]);

  if (!layout) {
    return (
      <>
        <SubHeader titleRender={titleRender} rightRender={rightRender} />
        <Container>
          <Card>
            <Typography variant="sectionHeader">This Grant type is not currently implemented</Typography>
          </Card>
        </Container>
      </>
    );
  }

  return (
    <ConfigForm formLayout={SFA_FORM_LAYOUT} data={grantData}>
      <SubHeader titleRender={titleRender} rightRender={rightRender} />
      <Container maxWidth={'xl'}>
        <NewForm businessRules={businessRules} />
      </Container>
    </ConfigForm>
  );
}

const FormButtonArea: FC = () => {
  const { useFormObject, forceReset } = useFormContext() as unknown as UseFormReturnWithSections;
  const { handleSubmit } = useFormObject;

  const onSubmit = (updatedData: any) => {
    const fieldData = { ...updatedData };
    const payload = { fields: fieldData };
    console.log('payload', payload);
  };

  const preSubmit = (evt: any) => {
    handleSubmit(onSubmit)(evt);
  };

  return (
    <ButtonArea>
      <Button data-src-form-button="reset" color="progressive" onClick={forceReset}>Reset</Button>
      <Button data-src-form-button="submit" color={'progressive'} onClick={preSubmit}>Save</Button>
      <Button data-src-form-button="reset" color="progressive" onClick={forceReset}>Complete</Button>
    </ButtonArea>
  );
}

const NewForm: FC = () => {
  const allContext = useFormContext() as unknown as UseFormReturnWithSections;
  const { sections, formProcessing } = allContext;
  const allFields = sections.map((section: Record<string, any>) => section.fields).flat();

  if (formProcessing) {
    return <div>Processing...</div>;
  }

  return (
    <form data-src-form="genericForm">
      <FormComponents allFields={allFields} components={AccompFormDef.components} baseAppearance={AccompFormDef.baseAppearance} />
    </form>
  );
}

export default GrantForm;