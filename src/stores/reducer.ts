import { IState, IAction, IMetaPathSummary } from 'types';
import { ACTION_TYPES } from 'stores/actions';

const rootReducer = (state: IState, action: IAction): IState => {
  switch (action.type) {
    case ACTION_TYPES.Go_Next:
      return { ...state, step: state.step + 1 };
    case ACTION_TYPES.Go_Prev:
      return { ...state, step: state.step - 1 };

    case ACTION_TYPES.Save_Page_Answer:
      return {
        ...state,
        answers: [...state.answers, ...action.payload.answers],
      };

    case ACTION_TYPES.Load_Drug_Options:
      return {
        ...state,
        drugPredictions: action.payload.drugPredictions,
        metaPathSummary: action.payload.metaPathSummary.map(
          (d: IMetaPathSummary, idx: number) => {
            return { ...d, hide: false, idx };
          }
        ),
      };

    case ACTION_TYPES.Load_Disease_Options:
      return { ...state, diseaseOptions: action.payload.diseaseOptions };

    case ACTION_TYPES.Load_Node_Types:
      return { ...state, nodeTypes: action.payload.nodeTypes };

    case ACTION_TYPES.Load_Edge_Types:
      return { ...state, edgeTypes: action.payload.edgeTypes };

    case ACTION_TYPES.Change_Disease:
      return {
        ...state,
        selectedDisease: action.payload.selectedDisease,
        attention: {},
        metaPathGroups: {},
      };

    case ACTION_TYPES.Change_Drug:
      return {
        ...state,
        drugPredictions: toggleDrugSelection(
          state.drugPredictions,
          action.payload.selectedDrug
        ),
      };

    case ACTION_TYPES.Load_Node_Name_Dict:
      return { ...state, nodeNameDict: action.payload.nodeNameDict };

    case ACTION_TYPES.Set_Loading_Status:
      return { ...state, ...action.payload };

    case ACTION_TYPES.Select_Path_Noes:
      return { ...state, selectedPathNodes: action.payload.selectedPathNodes };

    case ACTION_TYPES.Change_Edge_THR: {
      return { ...state, edgeThreshold: action.payload.edgeThreshold };
    }

    case ACTION_TYPES.Toggle_Meta_Path_Hide: {
      return { ...state, metaPathSummary: action.payload.metaPathSummary };
    }

    case ACTION_TYPES.Add_Attention_Paths: {
      return {
        ...state,
        attention: { ...state.attention, ...action.payload.attention },
        metaPathGroups: {
          ...state.metaPathGroups,
          ...action.payload.metaPathGroups,
        },
      };
    }

    case ACTION_TYPES.Del_Attention_Paths: {
      // deep copy
      let attention = JSON.parse(JSON.stringify(state.attention)),
        metaPathGroups = JSON.parse(JSON.stringify(state.metaPathGroups));

      delete attention[`drug:${action.payload.selectedDrug}`];
      delete metaPathGroups[action.payload.selectedDrug];
      return {
        ...state,
        attention,
        metaPathGroups,
      };
    }

    default:
      return state;
  }
};

const toggleDrugSelection = (
  drugPredictions: IState['drugPredictions'],
  selectedDrug: string
) => {
  return drugPredictions.map((d) => {
    return {
      ...d,
      selected: selectedDrug === d.id ? !d.selected : d.selected,
    };
  });
};

export const isAddDrug = (
  drugPredictions: IState['drugPredictions'],
  drugID: string
) => {
  return !drugPredictions
    .filter((d) => d.selected)
    .map((d) => d.id)
    .includes(drugID);
};
export default rootReducer;
