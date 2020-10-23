<?php

/**
 * This is the model class for table "lesson".
 *
 * The followings are the available columns in table 'lesson':
 * @property integer $id
 * @property integer $school_id
 * @property string $name
 * @property string $description
 * @property string $time
 * @property integer $danse_id
 * @property integer $userTeacher_id
* @property integer $userCreate_id
 * @property integer $private
 * @property integer $openInscriptioned
 * @property UserLesson[] $inscriptions
 * @property Enchainement[] $enchainements
 *
 * The followings are the available model relations:
 * @property School $school
 * @property Danse $danse
 * @property User $userTeacher
 * @property User $userCreate
 */
class Lesson extends CActiveRecord
{
	/**
	 * Returns the static model of the specified AR class.
	 * @param string $className active record class name.
	 * @return Lesson the static model class
	 */
	public static function model($className=__CLASS__)
	{
		return parent::model($className);
	}

	/**
	 * @return string the associated database table name
	 */
	public function tableName()
	{
		return 'lesson';
	}

	/**
	 * @return array validation rules for model attributes.
	 */
	public function rules()
	{
		// NOTE: you should only define rules for those attributes that
		// will receive user inputs.
		return array(
			array('school_id, name, time, danse_id, userTeacher_id', 'required'),
			array('school_id, danse_id, userTeacher_id, private, openInscription', 'numerical', 'integerOnly'=>true),
			array('name', 'length', 'max'=>45),
			array('description', 'length', 'max'=>250),
			array('time', 'length', 'max'=>100),
			// The following rule is used by search().
			// Please remove those attributes that should not be searched.
			array('id, school_id, name, description, openInscription, time, danse_id', 'safe', 'on'=>'search'),
		);
	}

	/**
	 * @return array relational rules.
	 */
	public function relations()
	{
		// NOTE: you may need to adjust the relation name and the related
		// class name for the relations automatically generated below.
		return array(
			'school' => array(self::BELONGS_TO, 'School', 'school_id'),
			'danse' => array(self::BELONGS_TO, 'Danse', 'danse_id'),
			'userTeacher' => array(self::BELONGS_TO, 'User', 'userTeacher_id'),
			'userCreate' => array(self::BELONGS_TO, 'User', 'userCreate_id'),
			'inscriptions' => array(self::HAS_MANY, 'UserLesson', 'lesson_id'),
			'inscriptionsCount' => array(self::STAT, 'UserLesson', 'lesson_id'),
			'enchainements' => array(self::HAS_MANY, 'Enchainement', 'lesson_id'),
			'enchainementsCount' => array(self::STAT, 'Enchainement', 'lesson_id'),
			'students' => array(self::HAS_MANY, 'User', array('user_id'=>'id'), 'through'=>'inscriptions'),
		);		
	}

	/**
	 * @return array customized attribute labels (name=>label)
	 */
	public function attributeLabels()
	{
		return array(
			'id' => 'Identifiant',
			'school_id' => 'Ecole',
			'name' => 'Nom',
			'description' => 'Description',
			'time' => 'Horaires',
			'danse_id' => 'Danse',
			'userTeacher_id' => 'Responsable',
			'private' => 'privé',
			'openInscription' => 'Inscriptions libres',
			'inscriptions' => 'Inscriptions'
		);
	}

	/**
	 * Retrieves a list of models based on the current search/filter conditions.
	 * @return CActiveDataProvider the data provider that can return the models based on the search/filter conditions.
	 */
	public function search()
	{
		// Warning: Please modify the following code to remove attributes that
		// should not be searched.

		$criteria=new CDbCriteria;

		$criteria->compare('id',$this->id);
		$criteria->compare('school_id',$this->school_id);
		$criteria->compare('name',$this->name,true);
		$criteria->compare('description',$this->description,true);
		$criteria->compare('time',$this->time,true);
		$criteria->compare('danse_id',$this->danse_id);
		$criteria->compare('private',$this->private);
		$criteria->compare('openInscription',$this->openInscription);

		return new CActiveDataProvider($this, array(
			'criteria'=>$criteria,
		));
	}
}