export default {
  close_editing_panel: {
    message: "Закінчіть редагування шару щоб закрити вікно редагування"
  },
  errors: {
    no_layers: "Помилка. Неможливо почати редагування шарів",
    some_layers: "Помилка: Неможливо почати редагування шарів",
    editing_multiple_relations: 'Редагування декількох відношень одночасно наразі не підтримується',
  },
  search: "Пошук",
  editing_changes: "Editing Changes",
  editing_data: "Редагування шарів",
  editing_attributes: "Редагування атрибутів",
  relations: "Відношення",
  edit_relation: "Редагувати відношення",
  back_to_relations: "Повернутися до відношень",
  no_relations_found: "Відношення відсутні",
  relation_data: "Дані відношення",
  relation_already_added: "Відношення вже додане",
  list_of_relations_feature: "Об'єкти відношення",
  tooltip: {
    edit_layer: "Редагувати шар",
    filter_by_relation: "Фільтрувати шари за відношенням",
  },
  toolbox: {
    title: 'Редагування'
  },
  table: {
    edit: "Редагувати об'єкт",
    copy: "Копіювати",
    delete: "Видалити"
  },
  tools: {
    copy: "Копіювати об'єкти",
    pastefeaturesfromotherlayers: "Вставити об'єкти з іншого шару",
    addpart: "Додати частину",
    deletepart: "Видалити частину",
    merge: "Злити об'єкти",
    split: "Розділити об'єкт",
    add_feature: "Додати",
    delete_feature: "Видалити",
    move_feature: "Перемістити",
    rotate_feature: "Функція повороту",
    update_vertex: "Змінити вершину",
    update_feature: "Змінити атрибути",
    update_multi_features: "Змінити атрибути вибраних об'єктів",
    update_multi_features_relations: "Змінити атрибути у вибраних відношеннях",
    update_multi_features_relations_from_parents : "Додати/Редагувати зв'язані записи батьківських об'єктів",
    copyfeaturefromexternallayer: "Створити об'єкт з доданого шару"
  },
  toolsoftool: {
    measure: "Вимірювання",
    snap: "Прив'язка до шару",
    snapall: "Прив'язка до всіх шарів"
  },
  steps: {
    help: {
      select_elements: "Вибрати об'єкти",
      select_element: "Вибрати об'єкт",
      copy: "Створити копію вибраних об'єктів",
      merge: "Злити об'єкти",
      split: "Розділити об'єкт",
      new: "Новий об'єкт",
      edit_table: "Редагувати таблицю атрибутів",
      draw_new_feature: "Оцифрувати об'єкт",
      action_confirm: "Підтвердити дію",
      double_click_delete: "Виберіть об'єкт, який потрібно видалити",
      edit_feature_vertex: "Змінити або додати вершину до вибраного об'єкта",
      move: "Перемістити вибраний об'єкт",
      select_feature_to_relation: "Виберіть об'єкт, який потрібно зв'язати",
      show_edit_feature_form:  "Відкрити форму об'єкту",
      pick_feature: "Виберіть об'єкт, який потрібно змінити",
      insert_attributes_feature: "Вставити атрибути об'єкта"
    }
  },
  workflow: {
    steps: {
      select: "Виберіть об'єкт",
      draw_part: "Оцифрувати нову частину",
      draw_geometry : "Оцифрувати об'єкт",
      merge: "Виберіть об'єкт, який потрібно злити",
      selectSHIFT: "Вибрати об'єкти у прямокутній області з затиснутим SHIFT",
      selectDrawBox: "Вибрати об'єкти у прямокутній області, що задана протилежними вершинами",
      selectDrawBoxAtLeast2Feature: "Вибрати щонайменше 2 об'єкти у прямокутній області, що задана протилежними вершинами",
      selectPoint: "Клацніть по об'єкту щоб вибрати його",
      selectPointSHIFT: "Виберіть об'єкти у прямокутній області з затиснутим SHIFT або клацніть по об'єкту",
      selectMultiPointSHIFT: "Виберіть об'єкти у прямокутній області з затиснутим SHIFT або клацніть по об'єкту",
      selectMultiPointSHIFTAtLeast2Feature: "Вибрати щонайменше 2 об'єкти у прямокутній області з затиснутим SHIFT або клацніть по об'єкту",
      copyCTRL: "Копіювати вибрані об'єкти за допомогою CTRL+C",
      selectStartVertex: "Вибрати початкову вершину",
      selectToPaste: "Вибрати точку, де буде вставлено об'єкти",
      draw_split_line: "Задайте лінію поділу вибраного об'єкта"
    },
    title: {
      steps: "Кроки"
    },
    next: "Далі",
  },
  messages: {
    featureslockbyotheruser: "Частина об'єктів/записів редагується іншим користувачем і недоступна для змін",
    splitted: "Розділено",
    nosplittedfeature: "Не розділено",
    press_esc: "Натисність ESC щоб повернутися",
    online: "Ви знову онлайн. Тепер ви можете зберегти зміни до бази даних",
    offline: "Ви офлайн. Зміни збережено на локальному рівні",
    delete_feature: "Видалити вибрані об'єкти?",
    delete_feature_relations: "Видалення об'єкта з посиланнми на відношення, призведе до утворення 'сиріт'. Перш ніж видаляти цей об'єкт, рекомендуємо розібратися з посиланнями",
    unlink_relation: "Розірвати відношення?",
    commit_feature: "Опис змін",
    toolbox_has_no_geometry: "шар без геометрії",
    toolbox_has_relation: "шар є частиною відношення",
    saved: "Дані збережено",
    saved_local:"Дані збережено на локальному рівні",
    loading_data: "Завантаження",
    saving: "Збереження. Будь ласка, зачекайте…",
    constraints: {
      enable_editing: "Для редагування слід збільшити масштаб \nІнструменти активуються на масштабі 1:"
    },
    pdf: "Попередній перегляд недоступний. Кланціть тут ",
    commit: {
      header: "Список змін, які буде збережено.",
      header_relation: "Відношення",
      header_add: "<b>Додано</b> показує кількість доданих об'єктів",
      header_update_delete: "<b>Змінено</b> та <b>Видалено</b> показують ID об'єктів",
      add: "Додано",
      delete: "Видалено",
      update: "Змінено"
    },
    loading_table_data: "Завантаження даних. Зачекайте…",
    copy_and_paste_from_other_layer_mandatory_fields: "Перш ніж зберегти зміни, необхідно заповнити обов'язкові поля у всіх вставлених об'єктах",
    no_feature_selected: "Об'єкти не вибрано",
    select_min_2_features: "Виберіть щонайменше 2 об'єкти"
  },
  relation: {
    table: {
      info: `<div>Виберіть відношення, яке необхідно зв'язати з об'єктом.</div>`
    },
    draw_new_feature: "Оцифрувати об'єкт",
    draw_or_copy: "або",
    copy_feature_from_other_layer: "Копіювати з іншого шару"
  },
  form: {
    relations: {
      tooltips: {
        back_to_father:"Повернутися до редагування батькіського об'єкта",
        add_relation: "Створити та додати відношення",
        link_relation: "Прив'язати відношення",
        open_relation_tools: "Інструменти відношення",
        unlink_relation: "Розірвати відношення"
      }
    },
    buttons: {
      save: "Вставка/Редагування",
      save_and_back: "Зберегти та повернутися",
      save_and_back_table: "Зберегти та повернутися",
      cancel: "Ігнорувати зміни"
    }
  },
  modal: {
    tools: {
      copyfeaturefromotherlayer: {
        title: "Вибрати шар",
        edit_attributes: "Редагувати атрибути вставлених об'єктів у груповому режимі"
      },
      copyfeaturefromprojectlayer: {
        title: "Вибрати об'єкт"
      }
    }
  }
}
