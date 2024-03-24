<template>
  <FieldWrapper :name="name" :label="label">
    <br>
    <div class="border-box">
      <div class="preview">
        Link Preview: <template v-if="!value?.url"><i>(No link added)</i></template>
        <DocumentLink v-if="value?.url" :url="value?.url" :name="value?.name"></DocumentLink>
      </div>
      <button v-if="!value?.url" class="text-button" type="button" @click="emitEvent(EMITS.ADD)">Add {{linkLabel}} Link</button>
      <template v-else>
        <button class="text-button" type="button" @click="emitEvent(EMITS.EDIT)">Edit</button><span class="spacer">|</span>
        <button class="text-button" type="button" @click="emitEvent(EMITS.DELETE)">Remove</button>
      </template>
      <br>
    </div>
  </FieldWrapper>
</template>

<script lang="ts">
import {
  computed, defineComponent, ref
} from 'vue';
import { useField } from 'vee-validate';
import { LINK_FIELD_EMITS as EMITS } from '@/constants';
import { fieldProps, stripIfLastWord } from '@/composables';

export default defineComponent({
  name: 'LinkField',
  emits: [
    EMITS.ADD,
    EMITS.DELETE,
    EMITS.EDIT,
  ],
  components: { },
  props: {
    ...fieldProps
  },
  setup(props, { emit }) {
    const isActive = ref<boolean>(false);

    const {
      value,
    } = useField(props.name as string, {
      initialValue: { url: '', name: '' },
      label: props.label,
    });

    return {
      EMITS,
      isActive,
      value,
      linkLabel: computed(() => stripIfLastWord(props.label, 'link')),
      emitEvent: (type) => {
        emit(type, props.name);
      }
    };
  },
});
</script>
<style scoped lang="scss">
  @import '@/styles/variables';
  .border-box {
    border: 1px solid $cardBorderColor;
    padding: 8px;
    border-radius: 4px;
  }

  .preview {
    padding-bottom: 4px;
    margin-bottom: 4px;
    border-bottom: 1px solid $cardBorderColor;
  }
  .spacer {
    padding-left: 8px;
    padding-right: 8px;
  }
</style>
