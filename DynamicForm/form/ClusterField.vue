<template>
  <FieldWrapper :name="name" :label="label" :noLabel="true">
    <template v-for="(field, index) in clusters" :key="field.id">
      <fieldset class="cluster">
        <h6 class="fieldset-label">{{label}} - {{index + 1}} of {{clusters.length}}</h6>
        <DynamicFields :fields="fields" :isCluster="true" :index="index" :clusterName="name"/>
        <button type="button" class="btn btn-secondary" @click="deleteCluster(index)" :disabled="crudding">
          <template v-if="crudding">
            <FAIcon :pulse="true" class="me-2"/>
          </template>Delete
        </button>
      </fieldset>
    </template>
    <div>
      <button type="button" class="btn btn-primary" @click="addCluster" :disabled="crudding">
        <template v-if="crudding">
            <FAIcon :pulse="true" class="me-2"/>
          </template>Add {{label}}
        </button>
    </div>
  </FieldWrapper>
</template>

<script lang="ts">
import {
  defineComponent, ref, onMounted, nextTick
} from 'vue';
import { useField } from 'vee-validate';
import { cloneDeep } from 'lodash';
import DynamicFields from '@/components/shared/form/DynamicFields.vue';
import { fieldProps } from '@/composables';

export default defineComponent({
  name: 'ClusterField',
  components: {
    DynamicFields
  },
  props: {
    ...fieldProps,
    fields: {
      type: Array
    }
  },
  setup(props) {
    const clusters = ref<any[]>([]);
    const crudding = ref<boolean>(false);
    let createCount = 0;

    const { value: dataModel, setTouched }: { value: any; setTouched } = useField(props.name as string, { label: props.label });

    const newClusterEntry = (array) => {
      array.push({ id: createCount });
      createCount += 1;
    };

    onMounted(() => {
      if (dataModel.value?.length) {
        const fresh: any[] = [];
        dataModel.value.forEach(() => {
          newClusterEntry(fresh);
        });
        clusters.value = fresh;
      } else {
        dataModel.value = [];
      }
    });

    const resetCluster = async (model: any = []) => {
      const copy: any[] = [];
      const fresh: any[] = [];
      const clone = [...model];

      clone.forEach((item) => {
        copy.push(item);
        newClusterEntry(fresh);
      });

      clusters.value = fresh;
      // Because dataModel is tied to the fields being generated need to wait for the new fields to render first
      await nextTick();

      // Now that the field elements are up to date manhandle the dataModel to use the reset values
      dataModel.value = copy;

      // May not need to wait for another tick
      await nextTick();
    };

    // Create a copy of the dataModel array
    const modelCopy = (): any[] => {
      const copy: any[] = [];
      if (dataModel.value?.length) {
        dataModel.value.forEach((item) => {
          // Also cloning the item. Not doing this appears to screw with how veeValidate binds validations to the field
          copy.push(cloneDeep(item));
        });
      }
      return copy;
    };

    return {
      clusters,
      dataModel,
      resetCluster,
      crudding,
      addCluster: () => {
        crudding.value = true;

        const copy = modelCopy();
        // Add the requested item
        newClusterEntry(clusters.value);

        // wait for the new field to be rendered then adjust the dataModel
        nextTick().then(() => {
          crudding.value = false;
          // The newly rendered field(s) cause the dataModel to have odd side effects / overwrites
          // Copy all the original values back into place
          dataModel.value.forEach((item, i) => {
            dataModel.value[i] = copy[i] || {};
          });

          // Update veeValidate touched flag
          setTouched(true);
        });
      },
      deleteCluster: async (index) => {
        crudding.value = true;
        const copy = modelCopy();

        // Remove the field at the given index
        clusters.value.splice(index, 1);
        await nextTick();

        // Remove the same index from the dataModel clone
        copy.splice(index, 1);

        // Updated version of the dataModel with the copy.
        // Attempts to splice the dataModel directly without a clone resulted in side effects
        // Not createing and restoring a data copy throws off the veeValidation binding
        dataModel.value = cloneDeep(copy);
        crudding.value = false;

        // Update veeValidate touched flag
        setTouched(true);
      },
    };
  },
});
</script>
<style scoped lang="scss">
  @import '@/styles/variables';
  .fieldset-label {
    font-weight: 700;
  }

  .cluster {
    border: 1px solid $cardBorderColor;
    padding: 8px;
    margin-bottom: 16px;
  }
</style>
