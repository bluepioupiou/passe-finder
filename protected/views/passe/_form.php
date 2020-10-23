<div class="form">

<?php $form=$this->beginWidget('CActiveForm', array(
	'id'=>'passe-form',
	'enableAjaxValidation'=>true,
)); ?>

	<p class="note">Les champs avec <span class="required">*</span> sont obligatoires.</p>

	<?php echo $form->errorSummary($model); ?>

	<div class="row">
		<?php echo $form->labelEx($model,'danse_id'); ?>
		<?php echo $form->dropDownList($model,'danse_id', CHtml::listData(Danse::model()->findAll(), 'id', 'name'),
            array(
                'ajax' => array(
                    'type'=>'POST',
                    'url'=>CController::createUrl('position/dynamicPositions'), //url to call.
                    'update'=>'#Passe_positionStart_id, #Passe_positionEnd_id'
                )
            )
        ); ?>
		<?php echo $form->error($model,'danse_id'); ?>
	</div>
    
   	<div class="row">
		<?php echo $form->labelEx($model,'name'); ?>
		<?php echo $form->textField($model,'name',array('size'=>50,'maxlength'=>50)); ?>
		<?php echo $form->error($model,'name'); ?>
	</div>

	<div class="row">
		<?php echo $form->labelEx($model,'positionStart_id'); ?>
		<?php echo $form->dropDownList($model,'positionStart_id', CHtml::listData(Position::model()->findAll(array('order'=>'name ASC', 'condition'=>'pending=0')), 'id', 'name')); ?>
		<?php echo $form->error($model,'positionStart_id'); ?>
	</div>

	<div class="row">
		<?php echo $form->labelEx($model,'positionEnd_id'); ?>
		<?php echo $form->dropDownList($model,'positionEnd_id', CHtml::listData(Position::model()->findAll(array('order'=>'name ASC', 'condition'=>'pending=0')), 'id', 'name')); ?>
		<?php echo $form->error($model,'positionEnd_id'); ?>
	</div>

	<div class="row">
		<?php echo $form->labelEx($model,'difficulty'); ?>
		<?php echo $form->dropDownList($model,'difficulty', array(1=>'1:Basique',2=>'2:Facile',3=>'3:Normal',4=>'4:Difficile',5=>'5:Technique')); ?>
		<?php echo $form->error($model,'difficulty'); ?>
	</div>

	<div class="row">
		<?php echo $form->labelEx($model,'description'); ?>
		<?php echo $form->textArea($model,'description',array('rows'=>6, 'cols'=>50)); ?>
		<?php echo $form->error($model,'description'); ?>
	</div>

	<div class="row">
		<?php echo $form->labelEx($model,'progress'); ?>
		<?php echo $form->textArea($model,'progress',array('rows'=>6, 'cols'=>50)); ?>
		<?php echo $form->error($model,'progress'); ?>
	</div>
	
	<div class="row">
		<?php echo $form->labelEx($model,'youtube_url'); ?>
		<?php echo $form->textField($model,'youtube_url',array('size'=>60,'maxlength'=>250)); ?>
		<?php echo $form->error($model,'youtube_url'); ?>
		<span class="alert i_info">Pour lier une vidéo, il suffit de copier le numéro d'identification Youtube de votre vidéo. Il s'agit de la suite de caractère 	après "..watch?v=" dans votre url</span>
	</div>
	
	<div class="row buttons">
		<?php echo CHtml::submitButton($model->isNewRecord ? 'Créer' : 'Sauvegarder'); ?>
	</div>

<?php $this->endWidget(); ?>

</div><!-- form -->