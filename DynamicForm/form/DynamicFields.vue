<template>
  <div>
    <template v-for="(field, fIndex) in fields" :key="`${field.render.name}-${fIndex}`">
      <LinkField v-if="!field.render.readOnly && field.type === FIELD_TYPES.LINK"
        v-bind="field.render"
        :id="idValue(field)"
        :name="nameValue(field)"
        @[LINK.ADD]="handleLinkEvent($event, field, 'add')"
        @[LINK.EDIT]="handleLinkEvent($event, field, 'edit')"
        @[LINK.DELETE]="handleLinkEvent($event, field, 'delete')"
      />
      <template v-else-if="!field.render.readOnly">
        <component v-if="!!triggerFields[field.path]"
          :ref="el => { makeRef(el, field.type) }"
          :is="field.render.is"
          v-bind="field.render"
          :id="idValue(field)"
          :name="nameValue(field)"
          @update:modelValue="changeHandler(field, name)"
        />
        <component v-else
          :ref="el => { makeRef(el, field.type) }"
          :is="field.render.is"
          v-bind="field.render"
          :id="idValue(field)"
          :name="nameValue(field)"
        />
      </template>
    </template>
  </div>
</template>

<script lang="ts">
import {
  defineComponent, ref, inject, onBeforeUpdate, PropType
} from 'vue';

import {
  FIELD_TYPES,
  LINK_FIELD_EMITS as LINK,
} from '@/constants';
import { DynamicField } from '@/models';

export default defineComponent({
  name: 'DynamicFields',
  props: {
    clusterName: {
      type: String,
      default: ''
    },
    isCluster: {
      type: Boolean,
      default: false
    },
    index: {
      type: Number
    },
    fields: {
      type: Array as PropType<DynamicField[]>,
    },
  },
  setup(props) {
    // TODO: Type this provide / inject for consistency
    const parts: any = inject('DynamicFormParts') || {};
    const { showLinkModal } = parts;
    // Array of refs to store ClusterField type fields.
    const clusters = ref<HTMLElement[]>([]);

    // Make sure to reset the refs before each update.
    onBeforeUpdate(() => {
      clusters.value = [];
    });

    return {
      ...parts,
      clusters,
      handleLinkEvent: (fName, field, type) => {
        const nested = props.isCluster ? { parent: props.clusterName, index: props.index, name: field.render.name } : null;
        showLinkModal(fName, field, type, nested);
      },
      nameValue: (field) => (
        props.isCluster && props.clusterName ? `${props.clusterName}[${props.index}].${field.render.name}` : field.render.name
      ),
      idValue: (field) => (
        props.isCluster ? `${props.clusterName}_${field.render.name}_${props.index}` : field.render.name
      ),
      makeRef: (el, type) => {
        if (type === FIELD_TYPES.CLUSTER) {
          clusters.value.push(el);
        }
      },
      resetClusters: async (resetCopy) => {
        if (clusters.value.length) {
          await Promise.all(clusters.value.map(async (clust) => {
            const clustRef = clust as any;
            if (clustRef && clustRef.resetCluster) {
              await clustRef.resetCluster(resetCopy[clustRef.name] || []);
            }
          }));
        }
      },
      FIELD_TYPES,
      LINK
    };
  },
});
</script>
