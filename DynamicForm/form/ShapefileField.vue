<template>
  <FieldWrapper :name="name" :label="label" :required="required">
    <br>
    <div>
      <!-- Dont forget to tell your buttons that they are buttons or else they may not be buttons like a zipper disgusing itself as a button -->
      <button type="button" class="btn btn-secondary" :disabled="!(shape.feature || !shape.valid)" @click="removeShapefile" style="margin-right: 1em">
          REMOVE SHAPEFIE
      </button>
      <button type="button" class="btn btn-primary" :disabled="isSubmitting" @click="uploadShapefile">
          {{ shape.valid && shape.feature ? 'REPLACE SHAPEFILE' : 'ADD SHAPEFILE' }}
      </button>
      <div role="alert" class="error-message" v-if="shape.message.length">
        Invalid shapefile: {{shape.message}}
      </div>
    </div>
  </FieldWrapper>
</template>

<script lang="ts">
import {
  computed,
  defineComponent, ref
} from 'vue';
import { promptAndProcessShapefile } from 'geometry-web-worker';
import FieldWrapper from '@/components/shared/form/FieldWrapper.vue';
import { LINK_FIELD_EMITS as EMITS } from '@/constants';
import { fieldProps, stripIfLastWord } from '@/composables';

export default defineComponent({
  name: 'ShapefileField',
  emits: [
    EMITS.ADD,
    EMITS.DELETE,
    EMITS.EDIT,
  ],
  components: {
    FieldWrapper,
  },
  props: {
    ...fieldProps
  },
  setup(props, { emit }) {
    const isActive = ref<boolean>(false);

    const shape = ref<any>({
      valid: true,
      feature: undefined,
      message: ''
    });

    const removeShapefile = () => {
      shape.value.valid = true;
      shape.value.feature = null;
      shape.value.message = '';
    };

    const uploadShapefile = async () => {
      promptAndProcessShapefile().then((features) => {
        // Features is an array of features
        if (features && features.length > 0) {
          // This is dumb. Let me do features[0];
          const [thisShape] = features;
          if (!thisShape.geometry) {
            shape.value.message = 'Shapefile contained a feature but the feature didnt have geometry';
            shape.value.valid = false;
          } else if (!['polygon', 'multipolygon'].includes(thisShape.geometry.type.toLowerCase())) {
            shape.value.message = `Shapefile contained a feature with an unsupported geometry type: ${thisShape.geometry.type}`;
            shape.value.valid = false;
          } else {
            shape.value.valid = true;
            shape.value.feature = thisShape;
          }
        } else {
          shape.value.message = 'Shapefile didnt contain any valid features';
          shape.value.valid = false;
        }
      })
        .catch((err) => {
        // TODO: Handle this better
          shape.value.message = err.join(' ');
          shape.value.valid = false;
        });
    };

    return {
      shape,
      uploadShapefile,
      removeShapefile,
      EMITS,
      isActive,
      linkLabel: computed(() => stripIfLastWord(props.label, 'link')),
      emitEvent: (type) => {
        emit(type, props.name);
      }
    };
  },
});
</script>
