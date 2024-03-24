<template>
  <FieldWrapper :required="required" :name="name" :label="label" :helpText="helpText" :id="id || name">
    <Field
      :as="as || 'input'"
      :id="id || name"
      :name="name"
      v-bind="attrs"
      :aria-describedby="helpText ? `${name}HelpBlock`: null"
      :validateOnInput="checkOnInput"
      :value="initValue !== null ? initValue : null"
      :class="{'form-control': as !== 'select', 'form-select': as === 'select'}"
      v-on="events"
      :placeholder="placeholder || `Enter ${label}`"
    >
      <template v-if="children && children.length">
        <component v-for="({ tag, text, ...childAttrs }, idx) in children"
          :key="idx"
          :is="tag"
          v-bind="childAttrs">
          {{ text }}
        </component>
      </template>
    </Field>
  </FieldWrapper>
</template>

<script lang="ts">
import {
  computed,
  defineComponent
} from 'vue';

import { Field } from 'vee-validate';
import { fieldProps } from '@/composables';

export default defineComponent({
  name: 'AnyField',
  props: {
    ...fieldProps,
    initValue: String,
    checkOnInput: {
      type: Boolean,
      default: false
    },
    placeholder: String,
    as: String,
    attrs: Object,
    onChange: Function,
    onInput: Function,
    children: Array,
    rules: [Object, Function, String]
  },
  components: {
    Field
  },
  setup(props) {
    const eventHandle = (e, method: any | undefined) => {
      if (method) {
        method(e.target.value);
      }
    };

    return {
      events: computed(() => {
        const on: any = {};
        if (props.onChange) {
          on.change = (e) => {
            eventHandle(e, props.onChange);
          };
        }

        if (props.onInput) {
          on.input = (e) => {
            eventHandle(e, props.onInput);
          };
        }

        return on;
      })
    };
  }
});
</script>
