<template>
  <FieldWrapper :name="name" :label="label" :required="required" :helpText="helpText">
    <ElSwitch v-model="dataModel"></ElSwitch>
  </FieldWrapper>
</template>

<script lang="ts">
import {
  defineComponent, watch
} from 'vue';
import { ElSwitch } from 'element-plus';
import { useField } from 'vee-validate';
import { fieldProps } from '@/composables';

export default defineComponent({
  name: 'CheckBox',
  emits: [
    'update:modelValue'
  ],
  components: {
    ElSwitch
  },
  props: {
    ...fieldProps,
    modelValue: {
      type: null,
    },
  },
  setup(props, { emit }) {
    const {
      value: dataModel,
    } = useField(props.name as string, undefined, {
      checkedValue: props.modelValue,
      type: 'checkbox',
      label: props.label,
    });

    // Part of this solution came from the vee-validate author see issue below for v-model
    // https://github.com/logaretm/vee-validate/issues/3173

    // you need to emit `update:modelValue`
    watch(dataModel, (newVal) => {
      if (newVal === props.modelValue) {
        return;
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

    return {
      dataModel,
    };
  },
});
</script>
