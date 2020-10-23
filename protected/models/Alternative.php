<?php

/**
 * This is the model class for table "alternative".
 *
 * The followings are the available columns in table 'alternative':
 * @property integer $positionStart_id
 * @property integer $positionAlternative_id
 * @property string $description
 * @property string $dateCreate
 * @property string $dateMaj
 *
 * The followings are the available model relations:
 * @property Position $positionStart
 * @property Position $positionAlternative
 */
class Alternative extends CActiveRecord
{
	/**
	 * Returns the static model of the specified AR class.
	 * @param string $className active record class name.
	 * @return Alternative the static model class
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
		return 'alternative';
	}

	/**
	 * @return array validation rules for model attributes.
	 */
	public function rules()
	{
		// NOTE: you should only define rules for those attributes that
		// will receive user inputs.
		return array(
			array('positionStart_id, positionAlternative_id, description, dateCreate', 'required'),
			array('positionStart_id, positionAlternative_id', 'numerical', 'integerOnly'=>true),
			array('description', 'length', 'max'=>250),
			array('dateMaj', 'safe'),
			// The following rule is used by search().
			// Please remove those attributes that should not be searched.
			array('positionStart_id, positionAlternative_id, description, dateCreate, dateMaj', 'safe', 'on'=>'search'),
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
			'positionStart' => array(self::BELONGS_TO, 'Position', 'positionStart_id'),
			'positionAlternative' => array(self::BELONGS_TO, 'Position', 'positionAlternative_id'),
		);
	}

	/**
	 * @return array customized attribute labels (name=>label)
	 */
	public function attributeLabels()
	{
		return array(
			'positionStart_id' => 'Position Start',
			'positionAlternative_id' => 'Position Alternative',
			'description' => 'Description',
			'dateCreate' => 'Date Creation',
			'dateMaj' => 'Date Maj',
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

		$criteria->compare('positionStart_id',$this->positionStart_id);
		$criteria->compare('positionAlternative_id',$this->positionAlternative_id);
		$criteria->compare('description',$this->description,true);
		$criteria->compare('dateCreate',$this->dateCreate,true);
		$criteria->compare('dateMaj',$this->dateMaj,true);

		return new CActiveDataProvider($this, array(
			'criteria'=>$criteria,
		));
	}
}