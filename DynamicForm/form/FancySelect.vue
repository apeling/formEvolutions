<template>
  <FieldWrapper :name="name" :label="label" :required="required" :helpText="helpText">
    <Multiselect
      ref="multiSelect"
      :searchable="searchable"
      :name="name"
      inputType="search"
      autocomplete="new-password"
      :id="id || name"
      :options="choices"
      v-model="dataModel"
      :mode="mode"
      :valueProp="valueProp"
      :placeholder="placeholder"
      @close="handleClose"
      @change="changeHandler"
    />
    <!-- @select="multiSelect.clearSearch()" -->
    <!-- Note field wrapper will automagically render vee-validate error message based name -->
  </FieldWrapper>
</template>

<script lang="ts">
import {
  defineComponent, onMounted, watch, ref, nextTick
} from 'vue';
import Multiselect from '@vueform/multiselect';
import { useField } from 'vee-validate';
import { fieldProps } from '@/composables';

export default defineComponent({
  name: 'FancySelect',
  emits: [
    'update:modelValue'
  ],
  components: {
    Multiselect
  },
  props: {
    ...fieldProps,
    placeholder: {
      type: String,
      default: 'Make a selection'
    },
    choices: {
      type: Array,
      required: true,
    },
    searchable: {
      type: Boolean,
      default: true
    },
    checkForHelp: {
      type: Boolean,
      default: false
    },
    valueProp: {
      type: String,
      default: 'id'
    },
    mode: {
      type: String,
      default: 'tags',
      validator: (prop: string) => [
        'tags',
        'multiple',
        'single'
      ].includes(prop)
    },
    modelValue: {
      type: null,
    },
  },
  setup(props, { emit }) {
    const helpText = ref<string>('');
    const multiSelect = ref<HTMLElement>();
    // const hasMounted =
    const {
      value: dataModel,
      handleBlur,
      validate,
    } = useField(props.name as string, {
      initialValue: props.modelValue,
      label: props.label,
    });

    const findHelp = (value: any) => {
      const helps: string[] = [];
      const values: any[] = Array.isArray(value) ? [...value] : [value];
      values.forEach((item) => {
        const found: any = props.choices.find((choice: any) => choice.id === parseInt(item as string, 10));
        if (found?.helpText) {
          helps.push(found?.helpText);
        }
      });
      helpText.value = helps.length ? helps.join('<br>') : '';
    };

    if (props.checkForHelp && dataModel && dataModel.value) {
      findHelp(dataModel.value);
    }

    // Part of this solution came from the vee-validate author see issue below for v-model
    // https://github.com/logaretm/vee-validate/issues/3173

    // you need to emit `update:modelValue`
    watch(dataModel, (newVal) => {
      if (newVal === props.modelValue) {
        return;
      }

      if (props.checkForHelp) {
        findHelp(dataModel.value);
      }

      // sync the model value with vee-validate model
      emit('update:modelValue', newVal);
    });

    // and you need to listen for `modelValue` prop changes
    watch(
      () => props.modelValue,
      (newModel) => {
        if (newModel === dataModel.value) {
          return;
        }

        // Sync the vee-validate model with model value
        dataModel.value = newModel;
      }
    );

    function clearSelect() {
      const msRef = multiSelect.value as any;
      msRef.clear();
    }

    onMounted(() => {
      watch(
        () => props.choices,
        (newModel: any) => {
          // Do not attempt to deselect if the dataModel is empty.
          // Not checking against this causes issues with hydrating with existing data when list has async options
          if (!dataModel.value) {
            return;
          }

          // Wrap in array
          const dataArray: any[] = Array.isArray(dataModel.value) ? dataModel.value : [dataModel.value];
          if (dataArray.length > 0) {
            // Check if any of the selected options are not in the current choices.
            // If any are not found clear the select
            // Might be able to update the model instead of the nuclear option, but would probably cause a cascade mess
            for (let i = 0; i < dataArray.length; i++) {
              const found = newModel.find((ch) => ch.id === dataArray[i]);

              if (!found) {
                clearSelect();
                break;
              }
            }
          }
        }
      );
    });

    const changeHandler = (e) => {
      nextTick().then(() => {
        handleBlur(e);
        if (props.checkForHelp) {
          findHelp(e);
        }
      });
    };

    return {
      helpText,
      dataModel,
      changeHandler,
      multiSelect,
      handleClose: (e) => {
        handleBlur(e);
        validate();
      },
    };
  },
});
</script>
