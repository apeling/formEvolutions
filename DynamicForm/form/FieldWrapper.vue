<template>
  <div class="form-group mb-3" :class="{required : required === true}">
    <label v-if="!noLabel" class="form-label" :for="id || name">{{ label }}</label>
    <slot></slot>
    <small v-if="helpText" v-html="helpText" :id="`${name}HelpBlock`" class="form-text text-muted"></small>
    <ErrorMessage as="div" class="error-message" :name="name"></ErrorMessage>
  </div>
</template>

<script lang="ts">
import {
  defineComponent
} from 'vue';

import { ErrorMessage } from 'vee-validate';
import { fieldProps } from '@/composables';

export default defineComponent({
  name: 'FieldWrapper',
  props: {
    ...fieldProps,
    noLabel: {
      type: Boolean,
      default: false
    }
  },
  components: {
    ErrorMessage,
  }
});
</script>
