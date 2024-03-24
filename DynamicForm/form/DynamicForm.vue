<template>
  <StickySub>
    <template #default>
      <h4 class="sub-header">
        <slot name="header">{{editMode ? 'Edit' : 'Create'}} {{editMode ? itemId : ''}}</slot>
      </h4>
    </template>
    <template #right>
      <button class="btn btn-secondary" type="button" :disabled="isSubmitting || !isHydrated" @click="cancel">Cancel</button>
      <button type="button"
        v-if="editMode"
        class="btn btn-secondary ms-3"
        :disabled="!isHydrated || !meta.touched || isSubmitting || layoutError"
        @click="resetForm"
      >Reset</button>
      <button class="btn btn-primary ms-3"
        type="button"
        :disabled="isSubmitting || !isHydrated  || layoutError"
        @click="checkValidate"
      ><template v-if="isSubmitting">
        <FAIcon :pulse="true" class="me-2"/>
      </template>{{isSubmitting ? submittingText : submitText}} {{name}}</button>
    </template>
  </StickySub>
  <div class="mt-3 container">
    <div id="row" class="mt-3">
      <div class="col-12">
        <div v-if="!isHydrated" class="container-card">
          <ElSkeleton :rows="6" animated :loading="!isHydrated"/>
        </div>
        <form v-if="isHydrated" id="instrumentForm">
          <div v-for="(section, index) in formSections" :key="index" class="container-card mb-3">
            <h5>{{section.name}}</h5>
            <p v-if="index === 0" class="mb-4">Required fields are marked with an asterisk (<span class="required-note" title="required">*</span>).</p>
            <div :id="`form_section_${index}`" class="row mt-3">
              <div class="col-12">
                <DynamicFields :fields="section.fields" :ref="el => {makeDynRef(el)}"/>
              </div>
            </div>
          </div>
        </form>
        <div v-if="layoutError && showLayoutError">
          <slot name="layoutError">There was a problem loading the layout for this {{name}}</slot>
          </div>
      </div>
    </div>
  </div>
  <LinkModal ref="linkModal"
    v-if="linkModalProps.name"
    v-bind="linkModalProps"
    @[LINK.ADD]="updateField"
    @[LINK.DELETE]="updateField"
  >
    <template #defaultName="slotProps">
      <p>
        <b>{{slotProps.nameLabel}}</b> is optional.<br>
        If one is not provided the name <b>{{slotProps.emptyNameValue}}</b> will be used.
      </p>
    </template>
  </LinkModal>
</template>

<script lang="ts">
import {
  defineComponent, ref, onMounted, PropType
} from 'vue';
import { scrollToFirstError } from '@/composables';
import { useDynamicForm } from '@/composables/DynamicFormHelpers';
import LinkModal from '@/components/shared/LinkModal.vue';
import DynamicFields from '@/components/shared/form/DynamicFields.vue';

import {
  DYN_FORM_EMITS,
  LINK_FIELD_EMITS as LINK
} from '@/constants';

export default defineComponent({
  name: 'DynamicForm',
  emits: [
    DYN_FORM_EMITS.CANCEL,
    DYN_FORM_EMITS.BEFORE_SUBMIT,
    DYN_FORM_EMITS.REQUEST_SUBMIT,
    DYN_FORM_EMITS.SUBMIT_BAILED,
    DYN_FORM_EMITS.LAYOUT_ERROR
  ],
  props: {
    id: {
      type: [String, Number]
    },
    name: {
      type: String,
      default: 'Instrument'
    },
    layoutUrl: {
      type: String,
      default: 'Instrument/GetLayoutForCategory'
    },
    loadedData: {
      type: Object as PropType<Record<string, any>>,
      default: () => ({}),
    },
    editMode: {
      type: Boolean,
      default: false
    },
    showLayoutError: {
      type: Boolean,
      default: true
    },
    createText: {
      type: String,
      default: 'Create'
    },
    creatingText: {
      type: String,
      default: 'Creating'
    },
    updateText: {
      type: String,
      default: 'Update'
    },
    updatingText: {
      type: String,
      default: 'Updating'
    },
    isSubmitting: {
      type: Boolean,
      default: false
    },
  },
  components: {
    LinkModal,
    DynamicFields
  },
  setup(props, { emit }) {
    const itemId = parseInt(props.id as string, 10);

    const layoutError = ref<boolean>(false);
    const isHydrated = ref<boolean>(false);

    const dynFormHelp = useDynamicForm();
    const {
      formSections, veeForm, dynFieldInstances, resetForm,
      makeDynRef, processDynamicForm, updateField,
      linkModal, linkModalProps
    } = dynFormHelp;
    const { meta } = veeForm;

    const handleError = (): void => {
      isHydrated.value = true;
      layoutError.value = true;
      emit(DYN_FORM_EMITS.LAYOUT_ERROR);
    };

    const setData = async (): Promise<void> => {
      const result = await dynFormHelp.load(props.id, props.layoutUrl);
      if (!result || !result.success || !result.hasSections) {
        console.warn(`There was an error loading ${props.name} layout`);
        handleError();
      }

      await dynFormHelp.setStructure(props.loadedData);
      isHydrated.value = true;
    };

    onMounted(setData);

    const onSubmit = veeForm.handleSubmit(() => {
      // Hydrate with all the user's input
      const payload: Record<string, any> = processDynamicForm();

      emit(DYN_FORM_EMITS.REQUEST_SUBMIT, payload);
    });

    return {
      LINK,
      itemId,
      dynFieldInstances,
      linkModal,
      linkModalProps,
      formSections,
      isHydrated,
      resetForm,
      meta,
      layoutError,
      makeDynRef,
      updateField,
      submitText: props.editMode ? props.updateText : props.createText,
      submittingText: props.editMode ? props.updatingText : props.creatingText,
      cancel: (): void => {
        emit(DYN_FORM_EMITS.CANCEL);
      },
      checkValidate: async (): Promise<void> => {
        emit(DYN_FORM_EMITS.BEFORE_SUBMIT);
        await veeForm.validate().then(scrollToFirstError);
        if (meta.value.valid) {
          onSubmit();
        } else {
          emit(DYN_FORM_EMITS.SUBMIT_BAILED);
        }
      },
    };
  }
});
</script>
